import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-text mb-2">Dashboard</h1>
      <p className="text-text-muted mb-8">Welcome to the Declay admin panel.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Orders',   value: '—', sub: 'All time'      },
          { label: 'Revenue',        value: '—', sub: 'All time'      },
          { label: 'Products',       value: '—', sub: 'Published'     },
          { label: 'Open Positions', value: '—', sub: 'Careers'       },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-5 rounded-xl border border-border bg-surface">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</p>
            <p className="font-serif text-3xl font-bold text-text">{value}</p>
            <p className="text-xs text-text-faint mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border bg-surface">
          <h2 className="font-serif text-lg font-semibold text-text mb-4">Recent Orders</h2>
          <p className="text-sm text-text-muted">Connect the API to see live data.</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-surface">
          <h2 className="font-serif text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/products/new',    label: 'Add new product'   },
              { href: '/admin/articles/new',    label: 'Write new article' },
              { href: '/admin/jobs',            label: 'Manage job listings' },
              { href: '/admin/orders',          label: 'View orders'       },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2 text-sm text-brand hover:underline"
              >
                → {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
