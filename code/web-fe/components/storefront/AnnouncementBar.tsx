'use client';

/**
 * M-44: site-wide campaign strip.
 *
 * A campaign changed prices but said nothing to the customer — the whole urgency
 * and "there is a reason to buy today" effect was being thrown away. This is the
 * cheapest place to recover it, and the first thing a visitor from Facebook or
 * TikTok sees on mobile.
 *
 * Deliberately dismissible and remembered per campaign: a bar the customer cannot
 * close is an annoyance on every page, and re-showing a dismissed bar teaches
 * people to ignore it. Dismissal is keyed by campaign id, so the NEXT campaign
 * still gets its chance.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import {
  campaignHref, countdownTo, countdownLabel, shouldShowCountdown, pickHeadlineCampaign,
  type ActiveCampaign,
} from '@/lib/campaign-display';
import { useT } from '@/lib/i18n/LocaleProvider';

const DISMISS_PREFIX = 'declay_campaign_dismissed_';

export default function AnnouncementBar({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useT();
  const [dismissed, setDismissed] = useState(true); // assume hidden until we check
  const [tick, setTick] = useState(0);

  const headline: ActiveCampaign | null = pickHeadlineCampaign(
    campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      discountPercent: Number(c.discountPercent),
      endsAt: c.endsAt,
    })),
  );

  useEffect(() => {
    if (!headline) return;
    // Cookie rather than localStorage: artifacts aside, this must survive a
    // normal browser session and is read on the client only.
    const marker = document.cookie.includes(`${DISMISS_PREFIX}${headline.id}=1`);
    setDismissed(marker);
  }, [headline?.id]);

  // Re-render once a minute so the countdown stays honest without a heavy timer.
  useEffect(() => {
    if (!headline?.endsAt) return;
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, [headline?.endsAt]);

  if (!headline || dismissed) return null;

  const countdown = countdownTo(headline.endsAt);
  // A campaign that expired between server render and now must not be advertised.
  if (countdown?.expired) return null;
  void tick;

  const remaining = shouldShowCountdown(countdown) ? countdownLabel(countdown) : null;

  function dismiss() {
    if (!headline) return;
    document.cookie = `${DISMISS_PREFIX}${headline.id}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    setDismissed(true);
  }

  return (
    <div className="relative bg-brand text-white">
      <Link
        href={campaignHref(headline.id)}
        className="block px-10 py-2 text-center text-sm hover:underline"
      >
        <span className="font-semibold">{headline.name}</span>
        <span className="mx-2">·</span>
        <span>{t('campaign.saveUpTo', { percent: String(headline.discountPercent) })}</span>
        {remaining && (
          <>
            <span className="mx-2">·</span>
            <span className="font-medium">{t('campaign.endsIn', { time: remaining })}</span>
          </>
        )}
      </Link>

      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/70 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
