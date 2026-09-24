'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, getAccessToken } from '../../../../lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discountTotal: string;
  shippingFee: string;
  grandTotal: string;
  paymentMethod: string;
  createdAt: string;
  guestToken?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: Array<{ id: string; productName: string; variantLabel: string; quantity: number; unitPrice: string; lineTotal: string }>;
  shippingAddress?: { name?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string; phone?: string } | null;
  address?: { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string; phone?: string | null } | null;
  user?: { fullName?: string | null; email?: string; phone?: string | null } | null;
  payment?: { provider: string; status: string; refundedAmount?: string | number | null } | null;
};

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

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
};

function hasAddress(value: Order['shippingAddress']): value is NonNullable<Order['shippingAddress']> & { line1: string; city: string; state: string; postalCode: string } {
  return Boolean(value?.line1 && value.city && value.state && value.postalCode);
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    const win = window as unknown as RazorpayWindow;
    if (win.Razorpay) return resolve(true);
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (win.Razorpay) return resolve(true);
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(Boolean(win.Razorpay)), 1500);
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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const guestToken = searchParams?.get('token');

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [retrySuccess, setRetrySuccess] = useState('');

  useEffect(() => {
    if (!params?.id) {
      return;
    }
    // If not authenticated and no guest token is provided, redirect to login
    if (!guestToken && !getAccessToken()) {
      router.replace('/login');
      return;
    }

    const orderUrl = guestToken
      ? `/orders/${params.id}?token=${encodeURIComponent(guestToken)}`
      : `/orders/${params.id}`;

    apiFetch<Order>(orderUrl, { next: { revalidate: 0 } })
      .then(setOrder)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load order'));
  }, [params?.id, router, guestToken]);

  async function handleRetryPayment() {
    if (!order || retrying) return;
    setRetrying(true);
    setRetryError('');
    setRetrySuccess('');

    try {
      const scriptReady = await loadRazorpayScript();
      const win = window as unknown as RazorpayWindow;
      if (!scriptReady || !win.Razorpay) {
        throw new Error('Payment gateway failed to initialize. Please check your network and try again.');
      }

      const activeGuestToken = guestToken || order.guestToken || undefined;

      const paymentOrder = await apiFetch<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>('/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          guestToken: activeGuestToken,
        }),
      });

      const options: RazorpayCheckoutOptions = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || 'INR',
        name: 'First Faith',
        description: `Order #${order.orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            await apiFetch<{ success: boolean }>('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                orderId: order.id,
                guestToken: activeGuestToken,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            setOrder((cur) => (cur ? { ...cur, status: 'PAID', payment: { ...cur.payment, provider: 'RAZORPAY', status: 'CAPTURED' } } : cur));
            setRetrySuccess('Payment verified successfully! Thank you for your order.');
          } catch (verifyErr: unknown) {
            setRetryError(verifyErr instanceof Error ? verifyErr.message : 'Payment verification failed. Please contact support.');
          } finally {
            setRetrying(false);
          }
        },
        prefill: {
          name: order.shippingAddress?.name || order.customerName || order.user?.fullName || undefined,
          email: order.customerEmail || order.user?.email || undefined,
          contact: order.shippingAddress?.phone || order.customerPhone || order.user?.phone || undefined,
        },
        theme: {
          color: '#7C2836',
        },
        modal: {
          ondismiss: () => {
            setRetryError('Payment cancelled. Your order is still pending. You can retry payment at any time.');
            setRetrying(false);
          },
        },
      };

      const rzp = new win.Razorpay(options);
      rzp.on('payment.failed', (resp: RazorpayPaymentFailure) => {
        setRetryError(resp?.error?.description || 'Payment was declined by your bank or gateway.');
        setRetrying(false);
      });
      rzp.open();
    } catch (err: unknown) {
      setRetryError(err instanceof Error ? err.message : 'Unable to initiate payment retry.');
      setRetrying(false);
    }
  }

  if (error) return <main className="site-shell" style={{ padding: '6rem 0' }}><p style={{ color: 'var(--ff-burgundy)' }}>{error}</p></main>;
  if (!order) return <main className="site-shell" style={{ padding: '6rem 0' }}><p style={{ color: 'var(--ff-charcoal-soft)' }}>Loading order...</p></main>;

  const delivery = hasAddress(order.shippingAddress) ? order.shippingAddress : order.address;
  const recipient = order.shippingAddress?.name || order.customerName || order.user?.fullName || order.customerEmail || order.user?.email;

  const isPendingOnline = order.paymentMethod === 'RAZORPAY' && order.status === 'PENDING' && order.payment?.status !== 'CAPTURED';
  const isPaid = order.status === 'PAID' || order.payment?.status === 'CAPTURED';
  const isRefunded = order.status === 'REFUNDED' || order.payment?.status === 'REFUNDED';

  return (
    <main className="site-shell" style={{ padding: '4rem 0 6rem' }}>
      <div style={{ maxWidth: '900px' }}>
        <p className="eyebrow">
          {isPaid ? 'Order confirmed' : isPendingOnline ? 'Payment Pending' : isRefunded ? 'Order Refunded' : 'Order Details'}
        </p>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)' }}>
          {isPaid ? 'Thank you for your order.' : isPendingOnline ? 'Complete your payment.' : `Order #${order.orderNumber}`}
        </h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--ff-charcoal-soft)' }}>
          {order.orderNumber} · Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        {retrySuccess && (
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.9rem', fontWeight: 600 }}>
            ✓ {retrySuccess}
          </div>
        )}

        {retryError && (
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px', background: '#fdf2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.9rem' }}>
            ℹ️ {retryError}
          </div>
        )}

        {isPendingOnline && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            borderRadius: '16px',
            background: 'rgba(238, 216, 207, 0.35)',
            border: '1.5px solid rgba(124, 40, 54, 0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--ff-charcoal)', fontSize: '1.05rem' }}>
                Payment Pending · ₹{Number(order.grandTotal).toLocaleString('en-IN')}
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)', maxWidth: '520px' }}>
                Your order is saved, but online payment has not been completed. Click below to resume payment securely via Razorpay.
              </p>
            </div>
            <button
              type="button"
              disabled={retrying}
              onClick={handleRetryPayment}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '0.95rem', minWidth: '180px' }}
            >
              {retrying ? 'Connecting to gateway...' : `Pay Now · ₹${Number(order.grandTotal).toLocaleString('en-IN')}`}
            </button>
          </div>
        )}

        <div className="order-detail-grid" style={{ marginTop: '2.5rem' }}>
          <section className="order-detail-panel">
            <h2>Items</h2>
            <div className="order-detail-items">
              {order.items.map((item) => (
                <div key={item.id}>
                  <span>{item.productName} · {item.variantLabel} × {item.quantity}</span>
                  <span>₹{Number(item.lineTotal).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="order-detail-total">
              <span>Total</span>
              <strong>₹{Number(order.grandTotal).toLocaleString('en-IN')}</strong>
            </div>
          </section>

          <section className="order-detail-panel">
            <h2>Delivery</h2>
            {delivery ? (
              <address className="delivery-address">
                {recipient && <strong>{recipient}</strong>}
                <span>{delivery.line1}</span>
                {delivery.line2 && <span>{delivery.line2}</span>}
                <span>{delivery.city}, {delivery.state}</span>
                <span>{delivery.postalCode}</span>
                {delivery.phone && <span>Phone: {delivery.phone}</span>}
              </address>
            ) : (
              <p className="delivery-unavailable">Delivery details are unavailable for this legacy order. Please contact support with your order number.</p>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--ff-stone)', fontSize: '0.85rem' }}>
              <p style={{ margin: '0.25rem 0', color: 'var(--ff-charcoal)' }}>
                <strong>Method:</strong> {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Razorpay Online Payment'}
              </p>
              <p style={{ margin: '0.25rem 0', color: 'var(--ff-charcoal)' }}>
                <strong>Payment Status:</strong>{' '}
                <span style={{
                  fontWeight: 600,
                  color: isPaid ? '#047857' : isRefunded ? '#b91c1c' : '#b45309',
                }}>
                  {isPaid ? 'Paid' : isRefunded ? 'Refunded' : 'Pending'}
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
