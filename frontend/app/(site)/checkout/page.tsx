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

  if (cartLoading || loading) {
    return (
      <main className="site-shell" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--ff-charcoal-soft)' }}>
        Preparing checkout...
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="site-shell" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p className="eyebrow">Checkout</p>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}>
          Your cart is empty.
        </h1>
        <div style={{ marginTop: '2rem' }}>
          <Button href="/shop">Shop the collection</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell" style={{ padding: '4rem 0 6rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="eyebrow">Checkout</p>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)' }}>
          Complete your ritual.
        </h1>
      </div>

      <form onSubmit={placeOrder} className="cart-layout">
        <div style={{ display: 'grid', gap: '2.5rem' }}>
          {/* DELIVERY ADDRESS */}
          <section className="cart-items-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(32, 28, 27, 0.1)', marginBottom: '1.25rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', margin: 0 }}>Delivery address</h2>
              <button
                type="button"
                onClick={() => setShowForm((visible) => !visible)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ff-burgundy)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showForm ? 'Use saved address' : '+ Add new address'}
              </button>
            </div>

            {!showForm && addresses.length > 0 && (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      border: selectedAddress === address.id ? '1.5px solid var(--ff-burgundy)' : '1px solid rgba(32, 28, 27, 0.12)',
                      background: selectedAddress === address.id ? 'rgba(238, 216, 207, 0.35)' : 'rgba(255, 255, 255, 0.6)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddress === address.id}
                      onChange={() => setSelectedAddress(address.id)}
                      style={{ marginTop: '0.2rem', accentColor: 'var(--ff-burgundy)' }}
                    />
                    <span style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--ff-charcoal)' }}>
                      <strong>{address.label || 'Address'}</strong><br />
                      {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.postalCode}, {address.country}
                      {address.phone ? ` · Tel: ${address.phone}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {!showForm && addresses.length === 0 && (
              <p style={{ fontSize: '0.92rem', color: 'var(--ff-charcoal-soft)', margin: '1rem 0' }}>
                No saved address. Please click &quot;+ Add new address&quot; above to continue.
              </p>
            )}

            {showForm && (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                {(['label', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'] as const).map((field) => (
                  <div key={field} className="form-group" style={{ margin: 0 }}>
                    <label htmlFor={field} className="form-label">
                      {field === 'postalCode' ? 'PIN / postal code' : field}
                    </label>
                    <input
                      id={field}
                      required={field !== 'label' && field !== 'line2'}
                      value={form[field] ?? ''}
                      onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                      className="form-input"
                    />
                  </div>
                ))}
                <div style={{ marginTop: '0.5rem' }}>
                  <Button type="button" onClick={saveAddress} disabled={submitting}>
                    Save address
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* PAYMENT METHOD */}
          <section className="cart-items-panel">
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(32, 28, 27, 0.1)' }}>
              Payment method
            </h2>
            <label
              style={{
                display: 'flex',
                gap: '0.85rem',
                border: '1.5px solid var(--ff-burgundy)',
                background: 'rgba(238, 216, 207, 0.35)',
                padding: '1.25rem',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <input type="radio" checked readOnly style={{ marginTop: '0.2rem', accentColor: 'var(--ff-burgundy)' }} />
              <span style={{ fontSize: '0.92rem', color: 'var(--ff-charcoal)' }}>
                <strong>Cash on delivery (COD)</strong><br />
                <span style={{ color: 'var(--ff-charcoal-soft)', fontSize: '0.85rem' }}>
                  Pay securely with cash or UPI when your First Faith order arrives.
                </span>
              </span>
            </label>
          </section>

          {(error || cartError) && (
            <p style={{ color: 'var(--ff-burgundy)', fontSize: '0.9rem', fontWeight: 600 }} role="alert">
              {error || cartError}
            </p>
          )}
        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <aside className="cart-summary">
          <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(32, 28, 27, 0.1)' }}>
            Order summary
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {cart.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', fontSize: '0.88rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, color: 'var(--ff-charcoal)' }}>
                    {item.variant.product.name} × {item.quantity}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)' }}>
                    ₹{Number(item.variant.price).toLocaleString('en-IN')} each
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ff-burgundy)' }}>
                    ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                  </span>
                  <div className="cart-qty-bar" style={{ padding: 0 }}>
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      disabled={submitting}
                      className="cart-qty-btn"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.9rem' }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: '0.78rem', padding: '0 0.2rem' }}>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      disabled={submitting || item.quantity >= (item.variant.inventory?.stockQuantity ?? item.quantity)}
                      className="cart-qty-btn"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.9rem' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(32, 28, 27, 0.1)' }}>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div className="summary-row muted">
              <span>Shipping</span>
              <strong style={{ color: 'var(--ff-success)' }}>FREE</strong>
            </div>
            <div className="summary-row" style={{ paddingTop: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <strong style={{ fontSize: '1.4rem' }}>₹{subtotal.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style={{ marginTop: '1.75rem' }}>
            <Button
              type="submit"
              className="btn-block"
              disabled={submitting || !selectedAddress || cart.items.length === 0}
            >
              {submitting ? 'Placing order...' : `Place order · ₹${subtotal.toLocaleString('en-IN')}`}
            </Button>
          </div>
          <p style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)', textAlign: 'center' }}>
            Ordering as {profile.fullName || 'your First Faith account'}.
          </p>
        </aside>
      </form>
    </main>
  );
}
