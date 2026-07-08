import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Store Policies' };

// NOTE (W-11): Template content — the store must review and replace this with
// the official policies before publishing.
export default function PoliciesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif text-4xl font-bold text-text mb-2">Store Policies</h1>
      <p className="text-text-faint text-sm mb-8">Last updated: (draft)</p>

      <div className="space-y-6 text-text-muted leading-relaxed">
        <p className="text-warning text-sm">
          This is a template. The final content must be reviewed by the store before publishing.
        </p>

        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Privacy Policy</h2>
          <p>We collect information (email, phone number, date of birth, address) to process orders and support customers, and we do not sell your data to third parties.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Shipping Policy</h2>
          <p>Delivery time and shipping fees vary by region. A tracking number is provided once your order ships.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold text-text mb-2">Returns &amp; Refunds Policy</h2>
          <p>Items may be returned or exchanged within the stated period if they remain in original condition. Refunds are processed to the original payment method.</p>
        </section>
      </div>
    </div>
  );
}
