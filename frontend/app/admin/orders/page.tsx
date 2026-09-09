'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Order = { id: string; orderNumber: string; status: string; grandTotal: string; createdAt: string; payment?: { provider: string; status: string } | null; user: { fullName?: string | null; email: string } };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<Order[]>('/admin/orders').then(setOrders).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load orders')); }, []);
  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><p className="eyebrow">Administration</p><h1 className="mt-3 font-display text-5xl text-charcoal">Orders</h1>{error ? <p className="mt-8 text-burgundy">{error}</p> : <div className="mt-10 overflow-x-auto border border-stone bg-white/60"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-stone text-xs uppercase tracking-[0.14em] text-charcoal-soft"><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Payment</th><th className="p-4">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-stone last:border-0"><td className="p-4"><Link href={`/admin/orders/${order.id}`} className="text-burgundy underline underline-offset-4">{order.orderNumber}</Link></td><td className="p-4">{order.user.fullName || order.user.email}</td><td className="p-4">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td><td className="p-4">₹{Number(order.grandTotal).toLocaleString('en-IN')}</td><td className="p-4">{order.payment?.provider || '—'} · {order.payment?.status || '—'}</td><td className="p-4">{order.status}</td></tr>)}</tbody></table></div>}</main>;
}
