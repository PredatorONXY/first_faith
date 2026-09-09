'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAccessToken } from '../../../lib/api';
import { useCart } from '../../../hooks/useCart';
import { Button } from '../../../components/ui/Button';

type Address = {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
};

type Profile = { fullName?: string | null };
type Order = { id: string };

type AddressForm = Omit<Address, 'id' | 'label'> & { label: string };

const emptyAddress: AddressForm = {
  label: 'Home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
  phone: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading: cartLoading, error: cartError, updateQuantity, removeItem, subtotal } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login?next=/checkout');
      return;
    }
    Promise.all([
      apiFetch<Address[]>('/auth/addresses'),
      apiFetch<Profile>('/auth/me'),
    ])
      .then(([savedAddresses, currentProfile]) => {
        setAddresses(savedAddresses);
        setSelectedAddress(savedAddresses[0]?.id ?? '');
        setProfile(currentProfile);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load checkout'))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveAddress() {
    const requiredFields: Array<keyof AddressForm> = ['line1', 'city', 'state', 'postalCode', 'country', 'phone'];
    const missingField = requiredFields.find((field) => !(form[field] ?? '').trim());
    if (missingField) {
      setError(`Enter your ${missingField === 'postalCode' ? 'PIN / postal code' : missingField}.`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const address = await apiFetch<Address>('/auth/addresses', { method: 'POST', body: JSON.stringify(form) });
      setAddresses((current) => [...current, address]);
      setSelectedAddress(address.id);
      setShowForm(false);
      setForm(emptyAddress);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save address');
    } finally {
      setSubmitting(false);
    }
  }

  async function changeQuantity(cartItemId: string, quantity: number) {
    setSubmitting(true);
    setError('');
    try {
      if (quantity < 1) await removeItem(cartItemId);
      else await updateQuantity(cartItemId, quantity);
    } catch (quantityError) {
      setError(quantityError instanceof Error ? quantityError.message : 'Unable to update your cart');
    } finally {
      setSubmitting(false);
    }
  }

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!selectedAddress) {
      setError('Choose or add a delivery address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const order = await apiFetch<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ addressId: selectedAddress, paymentMethod: 'COD' }),
      });
      window.dispatchEvent(new Event('ff:cart-changed'));
      router.push(`/account/orders/${order.id}`);
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : 'Unable to place order');
    } finally {
      setSubmitting(false);
    }
  }

  if (cartLoading || loading) return <main className="site-shell px-6 py-24 md:px-10"><p className="text-charcoal-soft">Preparing checkout...</p></main>;
  if (!cart || cart.items.length === 0) return <main className="site-shell px-6 py-24 md:px-10"><p className="eyebrow">Checkout</p><h1 className="mt-3 font-display text-5xl text-charcoal">Your cart is empty.</h1></main>;

  return <main className="site-shell px-6 py-16 md:px-10 md:py-24">
    <div className="max-w-4xl">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 font-display text-5xl text-charcoal">Complete your ritual.</h1>
      <form onSubmit={placeOrder} className="mt-12 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between border-b border-stone pb-4"><h2 className="font-display text-2xl">Delivery address</h2><button type="button" onClick={() => setShowForm((visible) => !visible)} className="text-sm text-burgundy underline underline-offset-4">{showForm ? 'Use saved address' : 'Add new address'}</button></div>
            {!showForm && addresses.length > 0 && <div className="mt-5 space-y-3">{addresses.map((address) => <label key={address.id} className="flex gap-3 border border-stone bg-white/50 p-4"><input type="radio" name="address" value={address.id} checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} /><span className="text-sm leading-6">{address.label || 'Address'}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.postalCode}, {address.country}</span></label>)}</div>}
            {!showForm && addresses.length === 0 && <p className="mt-5 text-sm text-charcoal-soft">Add a delivery address to continue.</p>}
            {showForm && <div className="mt-5 grid gap-4 sm:grid-cols-2">{(['label', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'] as const).map((field) => <label key={field} className={field === 'line1' || field === 'line2' ? 'sm:col-span-2' : ''}><span className="text-xs uppercase tracking-[0.14em] text-charcoal-soft">{field === 'postalCode' ? 'PIN / postal code' : field}</span><input required={field !== 'label' && field !== 'line2'} value={form[field] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full border border-stone bg-white/60 px-3 py-3 text-sm outline-none focus:border-burgundy" /></label>)}<Button type="button" onClick={saveAddress} className="sm:col-span-2" disabled={submitting}>Save address</Button></div>}
          </section>
          <section><h2 className="border-b border-stone pb-4 font-display text-2xl">Payment</h2><label className="mt-5 flex gap-3 border border-burgundy bg-blush/40 p-4"><input type="radio" checked readOnly /><span className="text-sm"><strong>Cash on delivery</strong><br /><span className="text-charcoal-soft">Pay when your First Faith order arrives.</span></span></label><p className="mt-3 text-xs text-charcoal-soft">Online payment is not enabled for this account yet.</p></section>
          {(error || cartError) && <p className="text-sm text-burgundy" role="alert">{error || cartError}</p>}
        </div>
        <aside className="h-fit border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Order summary</h2><div className="mt-6 space-y-3 text-sm">{cart.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4"><span>{item.variant.product.name} × {item.quantity}<br /><span className="text-xs text-charcoal-soft">₹{Number(item.variant.price).toLocaleString('en-IN')} each</span></span><span>₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}</span><div className="flex items-center border border-stone"><button type="button" aria-label={item.quantity === 1 ? `Remove ${item.variant.product.name}` : `Decrease ${item.variant.product.name}`} title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'} onClick={() => changeQuantity(item.id, item.quantity - 1)} disabled={submitting} className="px-2 py-1 text-burgundy disabled:opacity-50">−</button><span className="px-2 text-xs">{item.quantity}</span><button type="button" aria-label={`Increase ${item.variant.product.name}`} onClick={() => changeQuantity(item.id, item.quantity + 1)} disabled={submitting || item.quantity >= (item.variant.inventory?.stockQuantity ?? item.quantity)} className="px-2 py-1 text-burgundy disabled:opacity-50">+</button></div></div>)}</div><div className="mt-6 space-y-2 border-t border-stone pt-5 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div><div className="flex justify-between text-charcoal-soft"><span>Shipping</span><span>Free</span></div><div className="flex justify-between pt-2 font-medium"><span>Total</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div></div><Button type="submit" className="mt-6 w-full" disabled={submitting || !selectedAddress || cart.items.length === 0}>{submitting ? 'Placing order...' : `Place order for ₹${subtotal.toLocaleString('en-IN')}`}</Button><p className="mt-3 text-xs leading-5 text-charcoal-soft">Ordering as {profile.fullName || 'your First Faith account'}.</p></aside>
      </form>
    </div>
  </main>;
}
