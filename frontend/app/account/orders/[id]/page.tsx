'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  items: Array<{ id: string; productName: string; variantLabel: string; quantity: number; unitPrice: string; lineTotal: string }>;
  shippingAddress?: { name?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string; phone?: string } | null;
  address?: { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string; phone?: string | null } | null;
  user?: { fullName?: string | null; email?: string; phone?: string | null };
};

function hasAddress(value: Order['shippingAddress']): value is NonNullable<Order['shippingAddress']> & { line1: string; city: string; state: string; postalCode: string } {
  return Boolean(value?.line1 && value.city && value.state && value.postalCode);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) {
      return;
    }
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    apiFetch<Order>(`/orders/${params.id}`, { next: { revalidate: 0 } })
      .then(setOrder)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load order'));
  }, [params?.id, router]);

  if (error) return <main className="site-shell" style={{ padding: '6rem 0' }}><p style={{ color: 'var(--ff-burgundy)' }}>{error}</p></main>;
  if (!order) return <main className="site-shell" style={{ padding: '6rem 0' }}><p style={{ color: 'var(--ff-charcoal-soft)' }}>Loading order...</p></main>;

  const delivery = hasAddress(order.shippingAddress) ? order.shippingAddress : order.address;
  const recipient = order.shippingAddress?.name || order.user?.fullName || order.user?.email;

  return <main className="site-shell" style={{ padding: '4rem 0 6rem' }}><div style={{ maxWidth: '900px' }}><p className="eyebrow">Order confirmed</p><h1 className="display-title" style={{ fontSize: 'clamp(2.6rem, 5vw, 4.5rem)' }}>Thank you for your order.</h1><p style={{ marginTop: '1rem', color: 'var(--ff-charcoal-soft)' }}>{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</p><div className="order-detail-grid"><section className="order-detail-panel"><h2>Items</h2><div className="order-detail-items">{order.items.map((item) => <div key={item.id}><span>{item.productName} · {item.variantLabel} × {item.quantity}</span><span>₹{Number(item.lineTotal).toLocaleString('en-IN')}</span></div>)}</div><div className="order-detail-total"><span>Total</span><strong>₹{Number(order.grandTotal).toLocaleString('en-IN')}</strong></div></section><section className="order-detail-panel"><h2>Delivery</h2>{delivery ? <address className="delivery-address">{recipient && <strong>{recipient}</strong>}<span>{delivery.line1}</span>{delivery.line2 && <span>{delivery.line2}</span>}<span>{delivery.city}, {delivery.state}</span><span>{delivery.postalCode}</span>{delivery.phone && <span>Phone: {delivery.phone}</span>}</address> : <p className="delivery-unavailable">Delivery details are unavailable for this legacy order. Please contact support with your order number.</p>}<p className="order-payment">{order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod} · {order.status}</p></section></div></div></main>;
}
