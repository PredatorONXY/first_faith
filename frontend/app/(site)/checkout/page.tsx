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

type Profile = {
  id?: string;
  fullName?: string | null;
  email?: string;
  phone?: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  grandTotal?: number;
  status?: string;
};

type AddressForm = Omit<Address, 'id' | 'label'> & { label: string };

type PaymentMethodType = 'RAZORPAY' | 'COD';

type PaymentStatusState =
  | 'IDLE'
  | 'CREATING_ORDER'
  | 'OPENING_GATEWAY'
  | 'PROCESSING_PAYMENT'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED';

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayPaymentFailure {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: RazorpayPaymentFailure) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (window.Razorpay) return resolve(true);
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading: cartLoading, error: cartError, updateQuantity, removeItem, subtotal, clear: clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payment method & state management
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('RAZORPAY');
  const [paymentState, setPaymentState] = useState<PaymentStatusState>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    orderNumber: string;
    amount: number;
    paymentId?: string;
  } | null>(null);

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

  // Preload Razorpay script in background for zero-latency checkout
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  async function saveAddress() {
    const requiredFields: Array<keyof AddressForm> = ['line1', 'city', 'state', 'postalCode', 'country', 'phone'];
    const missingField = requiredFields.find((field) => !(form[field] ?? '').trim());
    if (missingField) {
      setError(`Enter your ${missingField === 'postalCode' ? 'PIN / postal code' : missingField}.`);
      return;
    }
    if (form.line1.trim().length < 3 || form.city.trim().length < 2 || form.state.trim().length < 2) {
      setError('Please enter a complete delivery address.');
      return;
    }
    if (!/^\d{6}$/.test(form.postalCode.trim())) {
      setError('Enter a valid 6-digit Indian PIN code.');
      return;
    }
    const normalizedPhone = (form.phone ?? '').trim().replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const address = await apiFetch<Address>('/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...form, phone: normalizedPhone, postalCode: form.postalCode.trim(), country: 'IN' }),
      });
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
    setError('');
    setPaymentErrorMessage('');

    // Flow 1: Cash on Delivery
    if (paymentMethod === 'COD') {
      setSubmitting(true);
      try {
        const order = await apiFetch<Order>('/orders', {
          method: 'POST',
          body: JSON.stringify({ addressId: selectedAddress, paymentMethod: 'COD' }),
        });
        clearCart();
        router.push(`/account/orders/${order.id}`);
      } catch (orderError) {
        setError(orderError instanceof Error ? orderError.message : 'Unable to place order');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Flow 2: Razorpay Online Payment
    setSubmitting(true);
    setPaymentState('CREATING_ORDER');

    try {
      // Step A: Ensure Razorpay SDK script is ready
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Payment gateway failed to initialize. Please check your network and try again.');
      }

      // Step B: Create order if not already pending for this checkout attempt
      let order = pendingOrder;
      if (!order) {
        order = await apiFetch<Order>('/orders', {
          method: 'POST',
          body: JSON.stringify({ addressId: selectedAddress, paymentMethod: 'RAZORPAY' }),
        });
        setPendingOrder(order);
      }

      // Step C: Ask backend to create/retrieve Razorpay order
      setPaymentState('OPENING_GATEWAY');
      const paymentOrder = await apiFetch<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id }),
      });

      const selectedAddressObj = addresses.find((a) => a.id === selectedAddress);

      // Step D: Open Razorpay checkout modal
      const options: RazorpayCheckoutOptions = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || 'INR',
        name: 'First Faith',
        description: `Order #${order.orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        handler: async (response: RazorpayPaymentResponse) => {
          setPaymentState('PROCESSING_PAYMENT');
          try {
            const verifyRes = await apiFetch<{
              success: boolean;
              orderId: string;
              orderNumber: string;
            }>('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                orderId: order!.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            // Payment verified and captured successfully
            clearCart();
            setCompletedOrder({
              id: order!.id,
              orderNumber: verifyRes.orderNumber || order!.orderNumber,
              amount: subtotal,
              paymentId: response.razorpay_payment_id,
            });
            setPaymentState('PAYMENT_SUCCESS');
          } catch (verifyErr: unknown) {
            setPaymentState('PAYMENT_FAILED');
            setPaymentErrorMessage(
              verifyErr instanceof Error ? verifyErr.message : 'Payment signature verification failed. Please contact support.',
            );
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: profile.fullName || undefined,
          email: profile.email || undefined,
          contact: selectedAddressObj?.phone || profile.phone || undefined,
        },
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        theme: {
          color: '#7C2836', // First Faith luxury burgundy
        },
        modal: {
          ondismiss: () => {
            setPaymentState('PAYMENT_CANCELLED');
            setSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: RazorpayPaymentFailure) => {
        setPaymentState('PAYMENT_FAILED');
        setPaymentErrorMessage(
          resp?.error?.description || 'Your payment was declined by the bank or gateway.',
        );
        setSubmitting(false);
      });
      rzp.open();
    } catch (paymentErr: unknown) {
      setError(paymentErr instanceof Error ? paymentErr.message : 'Unable to start online payment. Please try again.');
      setPaymentState('PAYMENT_FAILED');
      setSubmitting(false);
    }
  }

  // Render: Loading Screen
  if (cartLoading || loading) {
    return (
      <main className="site-shell" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--ff-charcoal-soft)' }}>
        <p className="eyebrow">Checkout</p>
        <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>Preparing your checkout experience...</p>
      </main>
    );
  }

  // Render: Payment Success State
  if (paymentState === 'PAYMENT_SUCCESS' && completedOrder) {
    return (
      <main className="site-shell" style={{ padding: '4rem 1rem 6rem', maxWidth: '640px', margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(124, 40, 54, 0.15)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 48px rgba(124, 40, 54, 0.08)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(74, 124, 89, 0.15), rgba(74, 124, 89, 0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2d6a4f',
              fontSize: '2rem',
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <p className="eyebrow" style={{ color: '#2d6a4f', marginBottom: '0.5rem' }}>Payment Confirmed</p>
          <h1 className="display-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '1rem' }}>
            Order placed successfully!
          </h1>
          <p style={{ color: 'var(--ff-charcoal-soft)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Thank you for choosing First Faith. Your payment of ₹{completedOrder.amount.toLocaleString('en-IN')} has been captured and your skincare ritual is being carefully prepared.
          </p>

          <div
            style={{
              background: 'rgba(248, 241, 235, 0.6)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2.25rem',
              textAlign: 'left',
              display: 'grid',
              gap: '0.85rem',
              fontSize: '0.9rem',
              border: '1px solid rgba(32, 28, 27, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--ff-charcoal-soft)' }}>Order Number</span>
              <strong>#{completedOrder.orderNumber}</strong>
            </div>
            {completedOrder.paymentId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--ff-charcoal-soft)' }}>Razorpay Payment ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--ff-charcoal)' }}>
                  {completedOrder.paymentId}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--ff-charcoal-soft)' }}>Total Paid</span>
              <strong style={{ color: 'var(--ff-burgundy)', fontSize: '1.05rem' }}>
                ₹{completedOrder.amount.toLocaleString('en-IN')}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--ff-charcoal-soft)' }}>Method</span>
              <span>Razorpay Online Payment</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button href={`/account/orders/${completedOrder.id}`} className="btn-primary">
              View Order Details
            </Button>
            <Button href="/shop" variant="outline">
              Explore Collection
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Render: Empty Cart State (when no pending order is active)
  if (!pendingOrder && (!cart || cart.items.length === 0)) {
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

  // Determine submit button label based on payment method and state
  let submitButtonLabel = `Place order · ₹${subtotal.toLocaleString('en-IN')}`;
  if (paymentMethod === 'RAZORPAY') {
    if (paymentState === 'CREATING_ORDER') submitButtonLabel = 'Preparing secure order...';
    else if (paymentState === 'OPENING_GATEWAY') submitButtonLabel = 'Connecting to Razorpay...';
    else if (paymentState === 'PROCESSING_PAYMENT') submitButtonLabel = 'Verifying payment...';
    else if (paymentState === 'PAYMENT_CANCELLED') submitButtonLabel = `Resume payment · ₹${subtotal.toLocaleString('en-IN')}`;
    else if (paymentState === 'PAYMENT_FAILED') submitButtonLabel = `Retry payment · ₹${subtotal.toLocaleString('en-IN')}`;
    else submitButtonLabel = `Pay online · ₹${subtotal.toLocaleString('en-IN')}`;
  } else if (submitting) {
    submitButtonLabel = 'Placing order...';
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
          {/* PAYMENT NOTICE / ALERTS */}
          {paymentState === 'PAYMENT_CANCELLED' && (
            <div
              style={{
                background: 'rgba(238, 216, 207, 0.45)',
                border: '1px solid rgba(124, 40, 54, 0.25)',
                borderRadius: '14px',
                padding: '1.15rem 1.35rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
              role="alert"
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>ℹ️</span>
              <div style={{ fontSize: '0.88rem', color: 'var(--ff-charcoal)' }}>
                <strong>Payment modal closed before completion.</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--ff-charcoal-soft)', lineHeight: 1.5 }}>
                  Your items are reserved under {pendingOrder ? `Order #${pendingOrder.orderNumber}` : 'your order'}. You can click &quot;Resume payment&quot; below to pay securely via Razorpay or choose Cash on Delivery.
                </p>
              </div>
            </div>
          )}

          {paymentState === 'PAYMENT_FAILED' && (
            <div
              style={{
                background: 'rgba(220, 53, 69, 0.08)',
                border: '1px solid rgba(220, 53, 69, 0.25)',
                borderRadius: '14px',
                padding: '1.15rem 1.35rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}
              role="alert"
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</span>
              <div style={{ fontSize: '0.88rem', color: 'var(--ff-charcoal)' }}>
                <strong style={{ color: '#c92a2a' }}>Payment could not be completed.</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--ff-charcoal-soft)', lineHeight: 1.5 }}>
                  {paymentErrorMessage || 'The transaction was declined by your bank or payment gateway. No money was charged. Please retry or choose another payment method.'}
                </p>
              </div>
            </div>
          )}

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
                      maxLength={field === 'line1' || field === 'line2' ? 160 : field === 'city' || field === 'state' ? 80 : field === 'postalCode' ? 6 : field === 'phone' ? 13 : 50}
                      inputMode={field === 'postalCode' || field === 'phone' ? 'numeric' : undefined}
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

          {/* PAYMENT METHOD SELECTION */}
          <section className="cart-items-panel">
            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(32, 28, 27, 0.1)', marginBottom: '1.25rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem', margin: 0 }}>
                Payment method
              </h2>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)' }}>
                Choose your preferred payment method. Transactions are encrypted and secure.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Option 1: Razorpay Online */}
              <label
                style={{
                  display: 'flex',
                  gap: '1rem',
                  border: paymentMethod === 'RAZORPAY' ? '1.5px solid var(--ff-burgundy)' : '1px solid rgba(32, 28, 27, 0.12)',
                  background: paymentMethod === 'RAZORPAY' ? 'rgba(238, 216, 207, 0.35)' : 'rgba(255, 255, 255, 0.6)',
                  padding: '1.25rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="RAZORPAY"
                  checked={paymentMethod === 'RAZORPAY'}
                  onChange={() => {
                    setPaymentMethod('RAZORPAY');
                    setError('');
                  }}
                  style={{ marginTop: '0.25rem', accentColor: 'var(--ff-burgundy)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ff-charcoal)' }}>
                      Pay online via Razorpay
                    </strong>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(124, 40, 54, 0.08)', color: 'var(--ff-burgundy)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                      Recommended
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0.6rem', color: 'var(--ff-charcoal-soft)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                    Instant confirmation with Cards (Visa, Mastercard, RuPay), UPI (Google Pay, PhonePe, Paytm), NetBanking &amp; Wallets.
                  </p>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--ff-charcoal-soft)' }}>
                    <span style={{ background: 'rgba(32, 28, 27, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 500 }}>UPI</span>
                    <span style={{ background: 'rgba(32, 28, 27, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 500 }}>Credit / Debit Cards</span>
                    <span style={{ background: 'rgba(32, 28, 27, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 500 }}>NetBanking</span>
                    <span style={{ background: 'rgba(32, 28, 27, 0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 500 }}>256-Bit SSL</span>
                  </div>
                </div>
              </label>

              {/* Option 2: COD */}
              <label
                style={{
                  display: 'flex',
                  gap: '1rem',
                  border: paymentMethod === 'COD' ? '1.5px solid var(--ff-burgundy)' : '1px solid rgba(32, 28, 27, 0.12)',
                  background: paymentMethod === 'COD' ? 'rgba(238, 216, 207, 0.35)' : 'rgba(255, 255, 255, 0.6)',
                  padding: '1.25rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => {
                    setPaymentMethod('COD');
                    setError('');
                  }}
                  style={{ marginTop: '0.25rem', accentColor: 'var(--ff-burgundy)' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ff-charcoal)' }}>
                    Cash on delivery (COD)
                  </strong>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                    Pay securely with cash or UPI to the delivery courier when your order arrives.
                  </p>
                </div>
              </label>
            </div>
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
            {cart?.items.map((item) => (
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
              disabled={submitting || !selectedAddress || (!pendingOrder && (!cart || cart.items.length === 0))}
            >
              {submitButtonLabel}
            </Button>
          </div>
          <p style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)', textAlign: 'center' }}>
            Ordering as {profile.fullName || profile.email || 'your First Faith account'}.
          </p>
        </aside>
      </form>
    </main>
  );
}
