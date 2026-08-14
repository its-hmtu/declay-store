import { CreditCard, Package, Truck, PackageCheck, XCircle, Check } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';

const STAGES = [
  { key: 'paid',       label: 'Paid',       icon: CreditCard },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped',    label: 'Shipped',    icon: Truck },
  { key: 'delivered',  label: 'Delivered',  icon: PackageCheck },
] as const;

export default function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-error/10 border border-error/20 text-error">
        <XCircle size={20} />
        <p className="font-medium">This order was cancelled.</p>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.key === status); // -1 for pending_payment

  return (
    <div>
      {status === 'pending_payment' && (
        <p className="mb-4 text-sm text-warning font-medium">Awaiting payment confirmation…</p>
      )}
      <div className="flex items-start">
        {STAGES.map((stage, i) => {
          const done    = i <= currentIndex;
          const current = i === currentIndex;
          const Icon    = stage.icon;
          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center relative">
              {/* connector to previous node */}
              {i > 0 && (
                <span
                  className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${i <= currentIndex ? 'bg-brand' : 'bg-border'}`}
                  aria-hidden
                />
              )}
              <div
                className={`relative z-10 size-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? 'bg-brand border-brand text-white'
                    : 'bg-surface border-border text-text-faint'
                } ${current ? 'ring-4 ring-brand/15' : ''}`}
              >
                {done && !current ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`mt-2 text-xs font-medium text-center ${done ? 'text-text' : 'text-text-faint'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
