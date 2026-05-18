'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Address, Cart } from '@/lib/types';
import { cartApi, ordersApi, addressApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutClient() {
  const [cart,          setCart]          = useState<Cart | null>(null);
  const [addresses,     setAddresses]     = useState<Address[]>([]);
  const [addressId,     setAddressId]     = useState<number | null>(null);
  const [clientSecret,  setClientSecret]  = useState<string | null>(null);
  const [orderId,       setOrderId]       = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }

    Promise.allSettled([
      cartApi.get(token),
      addressApi.list(token),
    ]).then(([cartRes, addrRes]) => {
      if (cartRes.status === 'fulfilled') setCart(cartRes.value.data);
      if (addrRes.status === 'fulfilled') {
        const list = addrRes.value.data;
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setAddressId(def.id);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function startCheckout() {
    const token = auth.getToken();
    if (!token || !addressId) return;
    setCreatingOrder(true);
    try {
      const { data } = await ordersApi.checkout(token, addressId);
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setCreatingOrder(false);
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">Loading…</div>
  );

  if (!auth.isLoggedIn()) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
      <p className="text-text-muted">Please log in to proceed.</p>
    </div>
  );

  const items    = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + parseFloat(i.variant?.price ?? '0') * i.quantity, 0);

  if (clientSecret && orderId) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-serif text-3xl font-bold text-text mb-8">Payment</h1>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm orderId={orderId} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-text mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Address */}
        <div>
          <h2 className="font-medium text-text mb-3">Shipping Address</h2>
          {addresses.length === 0 ? (
            <p className="text-sm text-text-muted">No saved addresses. <a href="/account/addresses" className="text-brand hover:underline">Add one</a>.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  addressId === addr.id ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'
                }`}>
                  <input
                    type="radio"
                    name="addressId"
                    value={addr.id}
                    checked={addressId === addr.id}
                    onChange={() => setAddressId(addr.id)}
                    className="mt-0.5 accent-brand"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-text">{addr.fullName}</p>
                    <p className="text-text-muted">{addr.street}, {addr.city}</p>
                    <p className="text-text-muted">{addr.country}{addr.postalCode ? ` ${addr.postalCode}` : ''}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <h2 className="font-medium text-text mb-3">Order Summary</h2>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-text-muted">
                <span>{item.variant?.product?.name} × {item.quantity}</span>
                <span>${(parseFloat(item.variant?.price ?? '0') * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-border flex justify-between font-semibold text-text">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            loading={creatingOrder}
            disabled={!addressId || items.length === 0}
            onClick={startCheckout}
          >
            Continue to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm({ orderId }: { orderId: number }) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?payment=success`,
      },
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" loading={loading} disabled={!stripe} className="w-full">
        Pay Now
      </Button>
    </form>
  );
}
