'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Truck } from 'lucide-react';
import { ghnTrackingUrl } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';

/**
 * M-13d: hiển thị mã vận đơn.
 *
 * Mã vận đơn là thứ khách sẽ sao chép đi dán vào trang tra cứu hoặc đọc cho
 * tổng đài — nên nút sao chép và link tra cứu quan trọng ngang bản thân con số.
 */
export default function TrackingCode({
  trackingNumber,
  carrier,
  compact = false,
}: {
  trackingNumber: string;
  carrier?: string | null;
  compact?: boolean;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard (thường do không phải HTTPS) — mã vẫn hiện
      // trên màn hình để khách chép tay, nên không cần báo lỗi ầm ĩ.
    }
  }

  const isGhn = (carrier ?? '').toUpperCase() === 'GHN';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted">
        <Truck size={12} />
        {trackingNumber}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4">
      <p className="eyebrow mb-1.5">
        {t('shipment.trackingNumber')}{carrier ? ` · ${carrier}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-lg font-semibold tracking-wide text-text">
          {trackingNumber}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={t('shipment.copy')}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-text-muted transition-colors hover:border-brand hover:text-brand"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? t('shipment.copied') : t('shipment.copy')}
        </button>
        {isGhn && (
          <a
            href={ghnTrackingUrl(trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <ExternalLink size={13} />
            {t('shipment.track')}
          </a>
        )}
      </div>
    </div>
  );
}
