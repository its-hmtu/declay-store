'use client';

import { ShoppingBag, CreditCard, Package, Truck, PackageCheck, Check, XCircle } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useT } from '@/lib/i18n/LocaleProvider';

const BLUE = '#2D6BFF';

const RANK: Record<string, number> = {
  pending_payment: 0, paid: 1, processing: 2, shipped: 3, delivered: 4, returned: 4, cancelled: 0,
};

type StepKey = 'placed' | 'paid' | 'processing' | 'shipped' | 'delivered';
const STEPS: { key: StepKey; reach: number; icon: typeof Package; labelKey: string }[] = [
  { key: 'placed',     reach: 0, icon: ShoppingBag,  labelKey: 'orderTimeline.placed' },
  { key: 'paid',       reach: 1, icon: CreditCard,   labelKey: 'orderTimeline.paid' },
  { key: 'processing', reach: 2, icon: Package,      labelKey: 'orderTimeline.processing' },
  { key: 'shipped',    reach: 3, icon: Truck,        labelKey: 'orderTimeline.shipped' },
  { key: 'delivered',  reach: 4, icon: PackageCheck, labelKey: 'orderTimeline.delivered' },
];

function fmt(iso?: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * M-30: dòng thời gian đơn hàng theo chiều DỌC.
 *
 * Mốc đã hoàn thành: chấm xanh + dấu tick (animation bung ra khi vừa hoàn thành,
 * vì trang tự làm mới → mốc mới render lại kèm animation). Mốc đang chờ kế tiếp:
 * vòng loading xoay quanh icon. Màu xanh #2D6BFF theo accent của store.
 */
function Node({ done, current, Icon }: { done: boolean; current: boolean; Icon: typeof Package }) {
  return (
    <div
      className="relative z-10 flex size-9 items-center justify-center rounded-full shrink-0"
      style={
        done
          ? { background: BLUE, color: '#fff' }
          : current
            ? { background: 'var(--color-surface)', border: `2px solid ${BLUE}`, color: BLUE }
            : { background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)' }
      }
    >
      {current && (
        <span
          aria-hidden
          className="absolute -inset-1 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: BLUE, borderRightColor: BLUE }}
        />
      )}
      {done ? <Check size={18} className="animate-tick" /> : <Icon size={17} className={current ? '' : 'text-text-faint'} />}
    </div>
  );
}

export default function OrderTimeline({ order, horizontal = false }: { order: Order; horizontal?: boolean }) {
  const { t } = useT();

  if (order.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-error/10 border border-error/20 text-error">
        <XCircle size={20} />
        <p className="font-medium">{t('orderTimeline.cancelled')}</p>
      </div>
    );
  }

  const rank = RANK[order.status] ?? 0;
  const currentIndex = STEPS.findIndex((s) => rank < s.reach); // mốc đang chờ kế tiếp

  const timeFor = (key: StepKey): string | null => {
    if (key === 'placed') return fmt(order.createdAt);
    if (key === 'paid') return fmt(order.paidAt);
    if (key === 'processing') return fmt(order.processingAt);
    if (key === 'shipped') return fmt(order.shipment?.shippedAt);
    if (key === 'delivered') return fmt(order.deliveredAt);
    return null;
  };

  // ── Chiều NGANG: các mốc trên một hàng, đường nối ngang. ──
  if (horizontal) {
    return (
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const done = rank >= step.reach;
          const current = i === currentIndex;
          const time = timeFor(step.key);
          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1/2 top-[17px] -z-0 h-0.5 w-full"
                  style={{ background: rank > STEPS[i - 1].reach ? BLUE : 'var(--color-border)' }}
                />
              )}
              <Node done={done} current={current} Icon={step.icon} />
              <p className={`mt-2 text-xs font-medium leading-tight ${done || current ? 'text-text' : 'text-text-faint'}`}>
                {t(step.labelKey as Parameters<typeof t>[0])}
              </p>
              {time && <p className="mt-0.5 text-[11px] text-text-muted">{time}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {STEPS.map((step, i) => {
        const done = rank >= step.reach;
        const current = i === currentIndex;
        const isLast = i === STEPS.length - 1;
        const Icon = step.icon;
        const time = timeFor(step.key);
        const hint = current && step.key === 'shipped' && order.shipment?.estimatedDeliveryAt
          ? `${t('orderTimeline.estimated')} ${fmt(order.shipment.estimatedDeliveryAt)}`
          : current && step.key === 'paid'
            ? t('orderTimeline.awaitingPayment')
            : null;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="relative flex size-9 items-center justify-center rounded-full shrink-0"
                style={
                  done
                    ? { background: BLUE, color: '#fff' }
                    : current
                      ? { background: 'var(--color-surface)', border: `2px solid ${BLUE}`, color: BLUE }
                      : { background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)' }
                }
              >
                {current && (
                  <span
                    aria-hidden
                    className="absolute -inset-1 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: BLUE, borderRightColor: BLUE }}
                  />
                )}
                {done ? (
                  <Check size={18} className="animate-tick" />
                ) : (
                  <Icon size={17} className={current ? '' : 'text-text-faint'} />
                )}
              </div>
              {!isLast && (
                <span
                  className="w-0.5 flex-1 min-h-6 my-1"
                  style={{ background: rank > step.reach ? BLUE : 'var(--color-border)' }}
                />
              )}
            </div>

            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <p className={`text-sm font-medium ${done || current ? 'text-text' : 'text-text-faint'}`}>
                {t(step.labelKey as Parameters<typeof t>[0])}
              </p>
              {time && <p className="text-xs text-text-muted mt-0.5">{time}</p>}
              {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { RANK as ORDER_STATUS_RANK };
export type { OrderStatus };
