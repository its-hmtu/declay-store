import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-surface-alt border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <p className="font-serif text-xl font-semibold text-brand">Declay</p>
            <p className="mt-2 text-sm text-text-muted leading-relaxed max-w-xs">
              Handcrafted figures made with love. Each piece is unique, just like you.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Shop</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-text-muted hover:text-brand transition-colors">All Products</Link></li>
              <li><Link href="/products?new=1" className="text-text-muted hover:text-brand transition-colors">New Arrivals</Link></li>
              <li><Link href="/cart" className="text-text-muted hover:text-brand transition-colors">Cart</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="text-text-muted hover:text-brand transition-colors">Journal</Link></li>
              <li><Link href="/careers" className="text-text-muted hover:text-brand transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="text-text-muted hover:text-brand transition-colors">Login</Link></li>
              <li><Link href="/register" className="text-text-muted hover:text-brand transition-colors">Register</Link></li>
              <li><Link href="/orders" className="text-text-muted hover:text-brand transition-colors">My Orders</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-faint">
          <p>&copy; {new Date().getFullYear()} Declay Store. All rights reserved.</p>
          <p>Secure payments via Stripe</p>
        </div>
      </div>
    </footer>
  );
}
