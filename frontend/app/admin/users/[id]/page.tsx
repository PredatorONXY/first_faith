'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';

type Customer = { fullName?: string | null; email: string; phone?: string | null; role: string; createdAt: string; addresses: Array<{ id: string; line1: string; city: string; state: string; postalCode: string; country: string; phone?: string | null }>; orders: Array<{ id: string; orderNumber: string; status: string; grandTotal: string; payment?: { status: string } | null; items: Array<{ productName: string; variantLabel: string; quantity: number; unitPrice: string }> }> };

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<Customer>(`/admin/users/${params.id}`).then(setCustomer).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load customer')); }, [params.id]);
  if (error) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-burgundy">{error}</p></main>;
  if (!customer) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-charcoal-soft">Loading customer...</p></main>;
  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><p className="eyebrow">Customer detail</p><h1 className="mt-3 font-display text-5xl text-charcoal">{customer.fullName || customer.email}</h1><p className="mt-4 text-sm text-charcoal-soft">{customer.email} · {customer.phone || 'No phone'} · {customer.role}</p><div className="mt-12 grid gap-8 lg:grid-cols-2"><section className="border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Addresses</h2><div className="mt-5 space-y-4 text-sm">{customer.addresses.map((address) => <p key={address.id} className="leading-6">{address.line1}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}{address.phone ? ` · ${address.phone}` : ''}</p>)}</div></section><section className="border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Orders</h2><div className="mt-5 space-y-6">{customer.orders.map((order) => <div key={order.id} className="border-b border-stone pb-5 text-sm last:border-0"><p className="flex justify-between"><strong>{order.orderNumber}</strong><span>{order.status} · ₹{Number(order.grandTotal).toLocaleString('en-IN')}</span></p><div className="mt-3 space-y-1 text-charcoal-soft">{order.items.map((item, index) => <p key={`${order.id}-${index}`}>{item.productName} · {item.variantLabel} × {item.quantity} at ₹{Number(item.unitPrice).toLocaleString('en-IN')}</p>)}</div></div>)}</div></section></div></main>;
}
