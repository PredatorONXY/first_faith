'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

type DashboardData = {
  users: number;
  orders: number;
  pendingOrders: number;
  completedOrders: number;
  products: number;
  lowStock: Array<{ stockQuantity: number; variant: { sku: string; product: { name: string } } }>;
  recentOrders?: Array<{ id: string; orderNumber: string; grandTotal: string; status: string; createdAt: string; user?: { fullName?: string | null; email: string } }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<DashboardData>('/admin/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Admin access required'));
  }, []);

  if (error) {
    return (
      <main style={{ padding: '3rem 0' }}>
        <div style={{ padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return <main style={{ padding: '3rem 0', color: 'var(--ff-charcoal-soft)' }}>Loading store analytics…</main>;
  }

  const metrics = [
    { label: 'Total Orders', value: data.orders, href: '/admin/orders' },
    { label: 'Pending / Open', value: data.pendingOrders, href: '/admin/orders' },
    { label: 'Delivered', value: data.completedOrders, href: '/admin/orders' },
    { label: 'Customers', value: data.users, href: '/admin/customers' },
    { label: 'Products', value: data.products, href: '/admin/products' },
  ];

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div>
        <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>First Faith Administration</p>
        <h1 className="font-display" style={{ fontSize: '2.25rem', color: 'var(--ff-charcoal)', marginTop: '0.25rem' }}>
          Store Overview
        </h1>
      </div>

      {/* Metric Cards */}
      <div style={{
        marginTop: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
      }}>
        {metrics.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="admin-metric-card"
          >
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ff-charcoal-soft)', margin: 0 }}>
              {item.label}
            </p>
            <p className="font-display" style={{ marginTop: '0.75rem', fontSize: '2rem', fontWeight: 600, color: 'var(--ff-burgundy)', margin: '0.5rem 0 0' }}>
              {item.value}
            </p>
          </Link>
        ))}
      </div>

      <div style={{
        marginTop: '2.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
      }}>
        {/* Low Stock Section */}
        <section className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ff-stone)', paddingBottom: '0.75rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0 }}>
              Low Stock Alerts
            </h2>
            <Link href="/admin/products" className="admin-btn-text" style={{ fontSize: '0.8rem', padding: 0 }}>
              View all products →
            </Link>
          </div>

          {data.lowStock.length === 0 ? (
            <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--ff-charcoal-soft)' }}>
              All products are comfortably stocked.
            </p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.lowStock.map((item) => (
                <div key={item.variant.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', borderBottom: '1px solid rgba(32,28,27,0.06)', paddingBottom: '0.6rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ff-charcoal)' }}>
                    {item.variant.product.name} <span style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', fontWeight: 400 }}>({item.variant.sku})</span>
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: '#fdf2f2',
                    color: 'var(--ff-burgundy)',
                    border: '1px solid #fecaca',
                  }}>
                    {item.stockQuantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders Section */}
        <section className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ff-stone)', paddingBottom: '0.75rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0 }}>
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="admin-btn-text" style={{ fontSize: '0.8rem', padding: 0 }}>
              View all orders →
            </Link>
          </div>

          {(!data.recentOrders || data.recentOrders.length === 0) ? (
            <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--ff-charcoal-soft)' }}>
              No recent orders found.
            </p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.recentOrders.map((order) => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', borderBottom: '1px solid rgba(32,28,27,0.06)', paddingBottom: '0.6rem' }}>
                  <div>
                    <Link href={`/admin/orders/${order.id}`} className="admin-btn-text" style={{ padding: 0, fontWeight: 600 }}>
                      {order.orderNumber}
                    </Link>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>
                      {order.user?.fullName || order.user?.email || 'Customer'} · {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>
                      ₹{Number(order.grandTotal).toLocaleString('en-IN')}
                    </p>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.2rem',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(238,216,207,0.4)',
                      color: 'var(--ff-charcoal)',
                      border: '1px solid var(--ff-stone)',
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
