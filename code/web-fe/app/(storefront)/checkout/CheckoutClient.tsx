'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Address, Cart, DiscountPreview, ShippingMethod } from '@/lib/types';
import { cartApi, ordersApi, addressApi, discountsApi, shippingMethodsApi } from '@/lib/api';
import { effectivePrice } from '@/lib/utils';
import { auth } from '@/lib/auth';
import Button from '@/components/ui/Button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function shippingZone(country?: string | null): 'domestic' | 'international' {
  const c = (country ?? '').trim().toLowerCase();
  if (c === '' || c === 'vn' || c === 'vietnam' || c === 'viet nam' || c === 'việt nam') return 'domestic';
  return 'international';
}

export default function CheckoutClient() {
  const [cart,          setCart]          = useState<Cart | null>(null);
  const [addresses,     setAddresses]     = useState<Address[]>([]);
  const [addressId,     setAddressId]     = useState<number | null>(null);
  const [clientSecret,  setClientSecret]  = useState<string | null>(null);
  const [orderId,       setOrderId]       = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [code,          setCode]          = useState('');
  const [discount,      setDiscount]      = useState<DiscountPreview | null>(null);
  const [applying,      setApplying]      = useState(false);
  const [shippingMethods,   setShippingMethods]   = useState<ShippingMethod[]>([]);
  const [shippingMethodId,  setShippingMethodId]  = useState<number | null>(null);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) { setLoading(false); return; }

    Promise.allSettled([
      cartApi.get(token),
      addressApi.list(token),
      shippingMethodsApi.list(),
    ]).then(([cartRes, addrRes, shipRes]) => {
      if (cartRes.status === 'fulfilled') setCart(cartRes.value.data);
      if (shipRes.status === 'fulfilled') setShippingMethods(shipRes.value.data);
      if (addrRes.status === 'fulfilled') {
        const list = addrRes.value.data;
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setAddressId(def.id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!shippingMethods.length) return;
    const zone = shippingZone(addresses.find((a) => a.id === addressId)?.country);
    const applicable = shippingMethods.filter((m) => m.zone === 'all' || m.zone === zone);
    setShippingMethodId((cur) => (cur && applicable.some((m) => m.id === cur) ? cur : (applicable[0]?.id ?? null)));
  }, [shippingMethods, addressId, addresses]);

  async function applyCoupon() {
    const token = auth.getToken();
    if (!token || !code.trim()) return;
    setApplying(true);
    try {
      const { data } = await discountsApi.validate(token, code.trim());
      setDiscount(data);
      toast.success('Coupon applied.');
    } catch (err: unknown) {
      setDiscount(null);
      toast.error(err instanceof Error ? err.message : 'Invalid coupon code.');
    } finally {
      setApplying(false);
    }
  }

  function removeCoupon() {
    setDiscount(null);
    setCode('');
  }

  async function startCheckout() {
    const token = auth.getToken();
    if (!token || !addressId) return;
    setCreatingOrder(true);
    try {
      const { data } = await ordersApi.checkout(token, addressId, discount?.code, shippingMethodId ?? undefined);
      setClientSecret(data.clientSecret);
      setOrderId(data.order.id);
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
  const subtotal = items.reduce((s, i) => s + effectivePrice(i.variant?.price, i.variant?.specialPrice, i.variant?.product?.campaignDiscountPercent) * i.quantity, 0);
  const selectedAddress   = addresses.find((a) => a.id === addressId) ?? null;
  const zone              = shippingZone(selectedAddress?.country);
  const applicableMethods = shippingMethods.filter((m) => m.zone === 'all' || m.zone === zone);
  const selectedMethod    = applicableMethods.find((m) => m.id === shippingMethodId) ?? null;
  const shippingFee       = selectedMethod
    ? (selectedMethod.freeOver != null && subtotal >= Number(selectedMethod.freeOver) ? 0 : Number(selectedMethod.fee))
    : 0;
  const total             = Math.max(0, subtotal - (discount?.discountAmount ?? 0) + shippingFee);

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
            <p className="text-sm text-text-muted">No saved addresses. <a href="/account" className="text-brand hover:underline">Add one</a>.</p>
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
                    <p className="font-medium text-text">{addr.receiverName} <span className="text-text-faint font-normal">· {addr.receiverPhone}</span></p>
                    <p className="text-text-muted">{addr.addressLine}, {addr.ward}, {addr.district}</p>
                    <p className="text-text-muted">{addr.city}, {addr.country}{addr.postalCode ? ` ${addr.postalCode}` : ''}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <h2 className="font-medium text-text mb-3 mt-6">Shipping Method</h2>
          {applicableMethods.length === 0 ? (
            <p className="text-sm text-text-muted">No shipping methods available.</p>
          ) : (
            <div className="space-y-2">
              {applicableMethods.map((m) => {
                const free = m.freeOver != null && subtotal >= Number(m.freeOver);
                return (
                  <label key={m.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${shippingMethodId === m.id ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'}`}>
                    <input type="radio" name="shippingMethod" checked={shippingMethodId === m.id} onChange={() => setShippingMethodId(m.id)} className="mt-0.5 accent-brand" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-text">{m.name}{m.estimatedDays ? <span className="font-normal text-text-faint"> · {m.estimatedDays}</span> : null}</p>
                      {m.description && <p className="text-text-muted">{m.description}</p>}
                    </div>
                    <span className="text-sm font-medium text-text">{free ? 'Free' : `$${Number(m.fee).toFixed(2)}`}</span>
                  </label>
                );
              })}
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
                <span>${(effectivePrice(item.variant?.price, item.variant?.specialPrice, item.variant?.product?.campaignDiscountPercent) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-success">
                <span>Discount ({discount.code})</span>
                <span>−${discount.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {selectedMethod && (
              <div className="flex justify-between text-text-muted">
                <span>Shipping ({selectedMethod.name})</span>
                <span>{shippingFee === 0 ? 'Free' : `$${shippingFee.toFixed(2)}`}</span>
              </div>
            )}
            <div className="pt-3 border-t border-border flex justify-between font-semibold text-text">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Coupon */}
          <div className="mt-4">
            {discount ? (
              <div className="flex items-center justify-between text-sm rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                <span className="text-success font-medium">Code “{discount.code}” applied</span>
                <button onClick={removeCoupon} className="text-text-muted hover:text-error">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand uppercase placeholder:normal-case"
                />
                <Button variant="outline" size="sm" loading={applying} disabled={!code.trim()} onClick={applyCoupon}>
                  Apply
                </Button>
              </div>
            )}
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
