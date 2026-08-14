'use client';

/**
 * M-44: campaign ribbon on the product page.
 *
 * This is the highest-value placement for urgency: the customer is already on the
 * page weighing a purchase, so "this price ends in 4 hours" is the difference
 * between buying now and forgetting. The announcement bar reaches more people; this
 * reaches the ones closest to converting.
 *
 * Renders nothing unless a campaign genuinely set this product's price — an
 * ordinary special price is not a deadline and must not be dressed up as one.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import {
  campaignHref, countdownTo, countdownLabel, shouldShowCountdown,
} from '@/lib/campaign-display';
import { useT } from '@/lib/i18n/LocaleProvider';

export default function CampaignRibbon({
  campaignId,
  campaignName,
  campaignEndsAt,
}: {
  campaignId?: number | null;
  campaignName?: string | null;
  campaignEndsAt?: string | null;
}) {
  const { t } = useT();
  const [, setTick] = useState(0);

  // Refresh once a minute so a countdown never sits visibly stale.
  useEffect(() => {
    if (!campaignEndsAt) return;
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, [campaignEndsAt]);

  if (!campaignId || !campaignName) return null;

  const countdown = countdownTo(campaignEndsAt);
  // Expired between render and now — say nothing rather than promise a price the
  // checkout will not honour.
  if (countdown?.expired) return null;

  const remaining = shouldShowCountdown(countdown) ? countdownLabel(countdown) : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-1.5 font-medium text-brand">
        <Tag size={14} />
        {t('campaign.partOf', { name: campaignName })}
      </span>

      {remaining && (
        <span className="font-semibold text-error">{t('campaign.endsIn', { time: remaining })}</span>
      )}

      <Link
        href={campaignHref(campaignId)}
        className="ml-auto text-xs text-text-muted underline underline-offset-2 hover:text-text"
      >
        {t('campaign.shopCampaign')}
      </Link>
    </div>
  );
}
