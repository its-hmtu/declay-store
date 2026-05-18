type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';

const cls: Record<Variant, string> = {
  default: 'bg-brand-faint text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error:   'bg-error/10 text-error',
  info:    'bg-info/10 text-info',
};

export default function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {children}
    </span>
  );
}
