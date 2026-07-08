import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms & Conditions' };

// NOTE (W-11): Template content — the store/legal team must review and replace
// this with the official terms before publishing.
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Terms &amp; Conditions</h1>
      <p className="text-text-faint text-sm mb-8">Last updated: (draft)</p>

      <div className="space-y-6 text-text-muted leading-relaxed">
        <p className="text-warning text-sm">
          This is a template. The final content must be reviewed by the store and legal team before publishing.
        </p>

        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">1. Acceptance of Terms</h2>
          <p>By creating an account and using Declay Store, you agree to comply with the terms set out below.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">2. Account</h2>
          <p>You are responsible for keeping your login credentials secure and for all activity that occurs under your account.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">3. Orders &amp; Payment</h2>
          <p>Orders are confirmed only after payment succeeds. Prices and stock availability may change without notice.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">4. Shipping &amp; Returns</h2>
          <p>Details on shipping and returns are provided on the Store Policies page.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">5. Contact</h2>
          <p>For any questions, please contact Declay Store support.</p>
        </section>
      </div>
    </div>
  );
}
