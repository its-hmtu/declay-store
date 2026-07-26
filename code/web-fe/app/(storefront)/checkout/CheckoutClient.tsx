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
import { guestSession } from '@/lib/guest';
import { useT } from '@/lib/i18n/LocaleProvider';
import Button from '@/components/ui/Button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function shippingZone(country?: string | null): 'domestic' | 'international' {
  const c = (country ?? '').trim().toLowerCase();
  if (c === '' || c === 'vn' || c === 'vietnam' || c === 'viet nam' || c === 'việt nam') return 'domestic';
  return 'international';
}

const emptyGuest = { name: '', email: '', phone: '' };
const emptyAddress = { addressLine: '', ward: '', district: '', city: '', country: 'Vietnam' };

export default function CheckoutClient() {
  const { t } = useT();
  const router = useRouter();
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
  const [shippingMethods,  setShippingMethods]  = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  // M-01 guest checkout
  const [isMember,      setIsMember]      = useState(false);
  const [guest,         setGuest]         = useState(emptyGuest);
  const [guestAddress,  setGuestAddress]  = useState(emptyAddress);
  const [payMethod,     setPayMethod]     = useState<'cod' | 'stripe' | 'vnpay'>('cod');
  // M-12 FX: cửa hàng niêm yết USD, VNPay chỉ nhận VND — hỏi backend số tiền thật
  // để khách thấy đúng con số sẽ bị trừ, và để ẩn VNPay khi chưa cấu hình tỉ giá.
  const [vnpQuote, setVnpQuote] = useState<{ amountVnd: number; rate: number; display: string } | null>(null);
  const [vnpUnavailable, setVnpUnavailable] = useState(false);

  useEffect(() => {
    const token = auth.getToken() ?? undefined;
    const member = Boolean(token);
    setIsMember(member);
    if (!token) guestSession.get(); // ensure the guest cart is addressable

    Promise.allSettled([
      cartApi.get(token),
      member ? addressApi.list(token!) : Promise.resolve({ data: [] as Address[] }),
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

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;
  const zone = shippingZone(isMember ? selectedAddress?.country : guestAddress.country);

  useEffect(() => {
    if (!shippingMethods.length) return;
    const applicable = shippingMethods.filter((m) => m.zone === 'all' || m.zone === zone);
    setShippingMethodId((cur) => (cur && applicable.some((m) => m.id === cur) ? cur : (applicable[0]?.id ?? null)));
  }, [shippingMethods, zone]);

  async function applyCoupon() {
    const token = auth.getToken();
    if (!token) { toast.error('Please sign in to use a coupon code.'); return; }
    if (!code.trim()) return;
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

  function removeCoupon() { setDiscount(null); setCode(''); }

  function guestFormReady(): boolean {
    return Boolean(
      guest.name.trim() && guest.email.trim() && guest.phone.trim() &&
      guestAddress.addressLine.trim() && guestAddress.ward.trim() &&
      guestAddress.district.trim() && guestAddress.city.trim(),
    );
  }

  async function startCheckout() {
    const token = auth.getToken() ?? undefined;
    setCreatingOrder(true);
    try {
      const { data } = await ordersApi.checkout(token, {
        ...(isMember ? { shippingAddressId: addressId ?? undefined } : { shippingAddress: guestAddress, guest }),
        ...(discount?.code ? { discountCode: discount.code } : {}),
        ...(shippingMethodId ? { shippingMethodId } : {}),
        paymentMethod: payMethod,
      });
      // M-12: VNPay owns the payment page — hand the buyer over to it.
      if (data.paymentUrl) {
        toast.message(t('checkout.redirecting'));
        window.location.href = data.paymentUrl;
        return;
      }
      // COD has no payment step — the order is already being prepared.
      if (!data.clientSecret) {
        toast.success(t('checkout.orderPlaced'));
        router.push(isMember ? `/orders/${data.order.id}` : `/orders/thank-you?id=${data.order.id}`);
        return;
      }
      setClientSecret(data.clientSecret);
      setOrderId(data.order.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setCreatingOrder(false);
    }
  }

  const items    = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + effectivePrice(i.variant?.price, i.variant?.specialPrice, i.variant?.product?.campaignDiscountPercent) * i.quantity, 0);
  const applicableMethods = shippingMethods.filter((m) => m.zone === 'all' || m.zone === zone);
  const selectedMethod    = applicableMethods.find((m) => m.id === shippingMethodId) ?? null;
  const shippingFee       = selectedMethod
    ? (selectedMethod.freeOver != null && subtotal >= Number(selectedMethod.freeOver) ? 0 : Number(selectedMethod.fee))
    : 0;
  const total    = Math.max(0, subtotal - (discount?.discountAmount ?? 0) + shippingFee);
  const canOrder = items.length > 0 && (isMember ? Boolean(addressId) : guestFormReady());

  // Số tiền VND lấy từ backend (nguồn tỉ giá duy nhất), cập nhật mỗi khi tổng đơn đổi.
  useEffect(() => {
    if (total <= 0) { setVnpQuote(null); return; }
    let stale = false;
    ordersApi
      .vnpayQuote(total)
      .then(({ data }) => { if (!stale) { setVnpQuote(data); setVnpUnavailable(false); } })
      .catch(() => { if (!stale) { setVnpQuote(null); setVnpUnavailable(true); } });
    return () => { stale = true; };
  }, [total]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-text-muted">{t('common.loading')}</div>
  );


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

  const inputCls = 'w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand text-text placeholder:text-text-faint';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-3xl font-bold text-text mb-8">{t('checkout.title')}</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {isMember ? (
            <>
              <h2 className="font-medium text-text mb-3">{t('checkout.shippingAddress')}</h2>
              {addresses.length === 0 ? (
                <p className="text-sm text-text-muted">No saved addresses. <a href="/account" className="text-brand hover:underline">Add one</a>.</p>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      addressId === addr.id ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'
                    }`}>
                      <input type="radio" name="addressId" value={addr.id} checked={addressId === addr.id}
                        onChange={() => setAddressId(addr.id)} className="mt-0.5 accent-brand" />
                      <div className="text-sm">
                        <p className="font-medium text-text">{addr.receiverName} <span className="text-text-faint font-normal">· {addr.receiverPhone}</span></p>
                        <p className="text-text-muted">{addr.addressLine}, {addr.ward}, {addr.district}</p>
                        <p className="text-text-muted">{addr.city}, {addr.country}{addr.postalCode ? ` ${addr.postalCode}` : ''}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium text-text">{t('checkout.yourDetails')}</h2>
                <a href="/login" className="text-xs text-brand hover:underline">{t('checkout.haveAccount')}</a>
              </div>
              <div className="space-y-2">
                <input className={inputCls} type="email" placeholder={`${t('checkout.email')} *`} value={guest.email}
                  onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))} />
                <input className={inputCls} placeholder={`${t('checkout.fullName')} *`} value={guest.name}
                  onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))} />
                <input className={inputCls} placeholder={`${t('checkout.phone')} *`} value={guest.phone}
                  onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} />
                <p className="text-xs text-text-faint">{t('checkout.phoneHint')}</p>
              </div>

              <h2 className="font-medium text-text mb-3 mt-6">{t('checkout.shippingAddress')}</h2>
              <div className="space-y-2">
                <input className={inputCls} placeholder={`${t('checkout.street')} *`} value={guestAddress.addressLine}
                  onChange={(e) => setGuestAddress((a) => ({ ...a, addressLine: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputCls} placeholder={`${t('checkout.ward')} *`} value={guestAddress.ward}
                    onChange={(e) => setGuestAddress((a) => ({ ...a, ward: e.target.value }))} />
                  <input className={inputCls} placeholder={`${t('checkout.district')} *`} value={guestAddress.district}
                    onChange={(e) => setGuestAddress((a) => ({ ...a, district: e.target.value }))} />
                  <input className={inputCls} placeholder={`${t('checkout.city')} *`} value={guestAddress.city}
                    onChange={(e) => setGuestAddress((a) => ({ ...a, city: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          <h2 className="font-medium text-text mb-3 mt-6">{t('checkout.shippingMethod')}</h2>
          {applicableMethods.length === 0 ? (
            <p className="text-sm text-text-muted">{t('checkout.noShippingMethods')}</p>
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
                    <span className="text-sm font-medium text-text">{free ? t('checkout.free') : `$${Number(m.fee).toFixed(2)}`}</span>
                  </label>
                );
              })}
            </div>
          )}

          <h2 className="font-medium text-text mb-3 mt-6">{t('checkout.payment')}</h2>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${payMethod === 'cod' ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'}`}>
              <input type="radio" name="payMethod" checked={payMethod === 'cod'} onChange={() => setPayMethod('cod')} className="accent-brand" />
              <span className="text-sm text-text">{t('checkout.cod')}</span>
            </label>
            {/* M-12: VNPay works for guests too — no account required.
                Ẩn hẳn khi backend chưa cấu hình tỉ giá: thà không cho chọn còn hơn
                để khách bấm vào rồi bị trừ sai số tiền. */}
            {!vnpUnavailable && (
              <label className={`flex flex-col gap-1 p-4 rounded-xl border cursor-pointer transition-colors ${payMethod === 'vnpay' ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="payMethod" checked={payMethod === 'vnpay'} onChange={() => setPayMethod('vnpay')} className="accent-brand" />
                  <span className="text-sm text-text">{t('checkout.vnpay')}</span>
                </span>
                {vnpQuote && (
                  <span className="pl-7 font-mono text-xs text-text-muted">
                    {t('checkout.vnpayCharged', {
                      amount: vnpQuote.display,
                      rate: vnpQuote.rate.toLocaleString('vi-VN'),
                    })}
                  </span>
                )}
              </label>
            )}
            {isMember && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${payMethod === 'stripe' ? 'border-brand bg-brand-faint' : 'border-border hover:border-brand-lighter'}`}>
                <input type="radio" name="payMethod" checked={payMethod === 'stripe'} onChange={() => setPayMethod('stripe')} className="accent-brand" />
                <span className="text-sm text-text">{t('checkout.card')}</span>
              </label>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="font-medium text-text mb-3">{t('checkout.orderSummary')}</h2>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-text-muted">
                <span>{item.variant?.product?.name} × {item.quantity}</span>
                <span>${(effectivePrice(item.variant?.price, item.variant?.specialPrice, item.variant?.product?.campaignDiscountPercent) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-text-muted">
              <span>{t('cart.subtotal')}</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-success">
                <span>{t('checkout.discount')} ({discount.code})</span><span>−${discount.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {selectedMethod && (
              <div className="flex justify-between text-text-muted">
                <span>{t('checkout.shipping')} ({selectedMethod.name})</span>
                <span>{shippingFee === 0 ? t('checkout.free') : `$${shippingFee.toFixed(2)}`}</span>
              </div>
            )}
            <div className="pt-3 border-t border-border flex justify-between font-semibold text-text">
              <span>{t('checkout.total')}</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          {isMember && (
            <div className="mt-4">
              {discount ? (
                <div className="flex items-center justify-between text-sm rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                  <span className="text-success font-medium">Code “{discount.code}” applied</span>
                  <button onClick={removeCoupon} className="text-text-muted hover:text-error">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('checkout.couponPlaceholder')}
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-brand uppercase placeholder:normal-case" />
                  <Button variant="outline" size="sm" loading={applying} disabled={!code.trim()} onClick={applyCoupon}>{t('checkout.apply')}</Button>
                </div>
              )}
            </div>
          )}

          <Button className="w-full mt-4" loading={creatingOrder} disabled={!canOrder} onClick={startCheckout}>
            {payMethod === 'cod' ? t('checkout.placeOrder') : t('checkout.continueToPayment')}
          </Button>
          {!isMember && <p className="mt-2 text-xs text-text-faint text-center">{t('checkout.noAccountNeeded')}</p>}
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm({ orderId }: { orderId: number }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}?payment=success` },
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" loading={loading} disabled={!stripe} className="w-full">Pay Now</Button>
    </form>
  );
}
