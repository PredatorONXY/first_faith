'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string;
  subtotal: string;
  discountTotal: string;
  paymentMethod: string;
  createdAt: string;
  user: { fullName?: string | null; email: string; phone?: string | null };
  address: { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string; phone?: string | null };
  items: Array<{ id: string; productName: string; variantLabel: string; quantity: number; unitPrice: string; lineTotal: string }>;
  payment?: {
    provider: string;
    status: string;
    providerOrderId?: string | null;
    providerPaymentId?: string | null;
    providerRefundId?: string | null;
    refundedAmount?: string | number | null;
    refundedAt?: string | null;
  } | null;
};

const statuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    apiFetch<AdminOrder>(`/admin/orders/${params.id}`)
      .then((value) => {
        setOrder(value);
        setStatus(value.status);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load order'));
  }, [params?.id]);

  async function updateStatus(newStatus?: string) {
    if (!params?.id) return;
    const targetStatus = newStatus || status;
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const value = await apiFetch<AdminOrder>(`/admin/orders/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      setOrder((current) => (current ? { ...current, status: value.status } : current));
      setStatus(value.status);
      setSuccess(`Order status updated to ${value.status}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update order');
    } finally {
      setUpdating(false);
    }
  }

  if (error && !order) {
    return (
      <div style={{ padding: '3rem 0' }}>
        <p style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>{error}</p>
        <Link href="/admin/orders" className="admin-btn-text" style={{ marginTop: '1rem', display: 'inline-block' }}>
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div style={{ padding: '3rem 0', color: 'var(--ff-charcoal-soft)' }}>Loading order details…</div>;
  }

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div>
        <Link href="/admin/orders" className="admin-btn-text" style={{ padding: 0 }}>
          ← Back to orders
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.75rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', margin: 0 }}>{order.orderNumber}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.25rem' }}>
              Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <span style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '999px',
            background: order.status === 'DELIVERED' ? '#ecfdf5' : order.status === 'CANCELLED' ? '#fdf2f2' : order.status === 'SHIPPED' ? '#eff6ff' : '#fef3c7',
            color: order.status === 'DELIVERED' ? '#047857' : order.status === 'CANCELLED' ? '#b91c1c' : order.status === 'SHIPPED' ? '#1d4ed8' : '#b45309',
            border: `1px solid ${order.status === 'DELIVERED' ? '#a7f3d0' : order.status === 'CANCELLED' ? '#fecaca' : order.status === 'SHIPPED' ? '#bfdbfe' : '#fde68a'}`,
          }}>
            {order.status}
          </span>
        </div>
      </div>

      {success && (
        <div style={{ marginTop: '1.5rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.875rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Main Content */}
        <section className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0 }}>Customer & Delivery Details</h2>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--ff-charcoal)' }}>
              <div>
                <p className="eyebrow" style={{ fontSize: '0.7rem' }}>Customer</p>
                <p style={{ marginTop: '0.25rem', fontWeight: 600 }}>{order.user.fullName || 'Unnamed'}</p>
                <p style={{ color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>{order.user.email}</p>
                <p style={{ color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>{order.user.phone || 'No phone recorded'}</p>
              </div>
              <div>
                <p className="eyebrow" style={{ fontSize: '0.7rem' }}>Shipping Address</p>
                <p style={{ marginTop: '0.25rem', lineHeight: 1.6 }}>
                  {order.address.line1}
                  {order.address.line2 && <><br />{order.address.line2}</>}
                  <br />
                  {order.address.city}, {order.address.state} {order.address.postalCode}
                  <br />
                  {order.address.country}
                  {order.address.phone ? ` · Tel: ${order.address.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--ff-stone)', paddingTop: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', marginBottom: '1rem' }}>Order Items</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(32,28,27,0.06)' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>{item.productName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>{item.variantLabel} × {item.quantity}</p>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>₹{Number(item.lineTotal).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--ff-stone)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857' }}>
                  <span>Discount</span>
                  <span>-₹{Number(order.discountTotal).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: 'var(--ff-charcoal)', paddingTop: '0.5rem', borderTop: '1px solid rgba(32,28,27,0.1)' }}>
                <span>Grand Total</span>
                <span>₹{Number(order.grandTotal).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Status Management */}
        <aside className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0 }}>Update Workflow</h2>
            <label htmlFor="orderStatusSelect" className="form-label" style={{ marginTop: '1rem', display: 'block' }}>Order Status</label>
            <select
              id="orderStatusSelect"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input"
              style={{ width: '100%', marginTop: '0.35rem' }}
            >
              {statuses.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>

            <button
              type="button"
              disabled={updating}
              onClick={() => updateStatus()}
              className="admin-btn admin-btn-primary"
              style={{ width: '100%', minHeight: '44px', marginTop: '0.75rem' }}
            >
              {updating ? 'Updating…' : 'Save Status'}
            </button>

            {order.status === 'PENDING' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => updateStatus('PROCESSING')}
                className="admin-btn admin-btn-secondary"
                style={{ width: '100%', minHeight: '40px', marginTop: '0.5rem' }}
              >
                Confirm Order (Set Processing)
              </button>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--ff-stone)', paddingTop: '1rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--ff-charcoal-soft)' }}>
            <p><strong style={{ color: 'var(--ff-charcoal)' }}>Payment Method:</strong> {order.paymentMethod}</p>
            <p><strong style={{ color: 'var(--ff-charcoal)' }}>Payment Status:</strong> {order.payment?.status || '—'}</p>
            <p><strong style={{ color: 'var(--ff-charcoal)' }}>Provider:</strong> {order.payment?.provider || 'COD'}</p>
            {order.payment?.providerPaymentId && (
              <p><strong style={{ color: 'var(--ff-charcoal)' }}>Payment ID:</strong> {order.payment.providerPaymentId}</p>
            )}
            {order.payment?.providerOrderId && (
              <p><strong style={{ color: 'var(--ff-charcoal)' }}>Order ID:</strong> {order.payment.providerOrderId}</p>
            )}
            {order.payment?.refundedAmount && Number(order.payment.refundedAmount) > 0 ? (
              <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', marginTop: '0.5rem' }}>
                <p style={{ fontWeight: 600, color: '#991b1b', margin: 0 }}>Refund Details</p>
                <p style={{ margin: '0.25rem 0 0', color: '#b91c1c' }}>
                  Refunded: ₹{Number(order.payment.refundedAmount).toLocaleString('en-IN')}
                </p>
                {order.payment.providerRefundId && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#7f1d1d' }}>
                    Refund ID: {order.payment.providerRefundId}
                  </p>
                )}
                {order.payment.refundedAt && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#7f1d1d' }}>
                    Refund Date: {new Date(order.payment.refundedAt).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
