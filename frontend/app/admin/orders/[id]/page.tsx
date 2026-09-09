'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';

type AdminOrder = { id: string; orderNumber: string; status: string; grandTotal: string; subtotal: string; discountTotal: string; paymentMethod: string; user: { fullName?: string | null; email: string; phone?: string | null }; address: { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string; phone?: string | null }; items: Array<{ id: string; productName: string; variantLabel: string; quantity: number; unitPrice: string; lineTotal: string }>; payment?: { provider: string; status: string } | null };
const statuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<AdminOrder>(`/admin/orders/${params.id}`).then((value) => { setOrder(value); setStatus(value.status); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load order')); }, [params.id]);
  async function updateStatus() { setError(''); try { const value = await apiFetch<AdminOrder>(`/admin/orders/${params.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); setOrder((current) => current ? { ...current, status: value.status } : current); } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update order'); } }
  if (error && !order) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-burgundy">{error}</p></main>;
  if (!order) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-charcoal-soft">Loading order...</p></main>;
  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><p className="eyebrow">Order management</p><h1 className="mt-3 font-display text-5xl text-charcoal">{order.orderNumber}</h1><div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]"><section className="border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Customer and delivery</h2><p className="mt-5 text-sm leading-6">{order.user.fullName || order.user.email}<br />{order.user.email}<br />{order.user.phone || order.address.phone || ''}</p><p className="mt-5 border-t border-stone pt-5 text-sm leading-6">{order.address.line1}<br />{order.address.line2 && <>{order.address.line2}<br /></>}{order.address.city}, {order.address.state} {order.address.postalCode}<br />{order.address.country}</p><h2 className="mt-10 border-t border-stone pt-5 font-display text-2xl">Items</h2><div className="mt-5 space-y-4 text-sm">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span>{item.productName} · {item.variantLabel} × {item.quantity}</span><span>₹{Number(item.lineTotal).toLocaleString('en-IN')}</span></div>)}</div></section><aside className="h-fit border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Status</h2><select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-5 w-full border border-stone bg-white px-3 py-3 text-sm">{statuses.map((value) => <option key={value}>{value}</option>)}</select><button type="button" onClick={updateStatus} className="mt-4 w-full bg-burgundy px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white">Update status</button><p className="mt-6 text-sm leading-6">Payment: {order.payment?.provider || order.paymentMethod}<br />Payment status: {order.payment?.status || '—'}<br />Total: ₹{Number(order.grandTotal).toLocaleString('en-IN')}</p>{error && <p className="mt-4 text-sm text-burgundy">{error}</p>}</aside></div></main>;
}
