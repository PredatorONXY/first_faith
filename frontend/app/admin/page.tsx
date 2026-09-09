'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Dashboard = { users: number; orders: number; pendingOrders: number; completedOrders: number; products: number; lowStock: Array<{ stockQuantity: number; variant: { sku: string; product: { name: string } } }> };

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<Dashboard>('/admin/dashboard').then(setData).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Admin access required')); }, []);
  if (error) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-burgundy">{error}</p></main>;
  if (!data) return <main className="site-shell px-6 py-20 md:px-10"><p className="text-charcoal-soft">Loading dashboard...</p></main>;
  const metrics = [['Customers', data.users], ['Orders', data.orders], ['Open orders', data.pendingOrders], ['Delivered', data.completedOrders], ['Products', data.products]];
  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><p className="eyebrow">First Faith administration</p><h1 className="mt-3 font-display text-5xl text-charcoal">Quietly in control.</h1><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="border border-stone bg-white/60 p-5"><p className="text-xs uppercase tracking-[0.14em] text-charcoal-soft">{label}</p><p className="mt-4 font-display text-4xl text-burgundy">{value}</p></div>)}</div><section className="mt-12 border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Low stock</h2>{data.lowStock.length === 0 ? <p className="mt-4 text-sm text-charcoal-soft">Everything is comfortably stocked.</p> : <div className="mt-4 space-y-3 text-sm">{data.lowStock.map((item) => <p key={item.variant.sku} className="flex justify-between border-b border-stone pb-3"><span>{item.variant.product.name} · {item.variant.sku}</span><span className="text-burgundy">{item.stockQuantity} left</span></p>)}</div>}</section></main>;
}
