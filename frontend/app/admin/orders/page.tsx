'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string;
  createdAt: string;
  paymentMethod?: string;
  payment?: { provider: string; status: string } | null;
  user: { fullName?: string | null; email: string };
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Order[]>('/admin/orders')
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load orders');
        setLoading(false);
      });
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (order.user.fullName && order.user.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>Store Operations</p>
        <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', marginTop: '0.25rem' }}>
          Orders
        </h1>
      </div>

      {/* Filters & Search */}
      <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by order #, customer, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ flex: '1 1 280px', minWidth: '220px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ marginTop: '2rem', color: 'var(--ff-charcoal-soft)' }}>Loading orders…</p>}

      {!loading && filteredOrders.length === 0 && (
        <div style={{ marginTop: '2rem', padding: '3rem 1.5rem', textAlign: 'center', border: '1px solid var(--ff-stone)', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
          <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)' }}>No orders found</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem' }}>Try adjusting your search or status filter.</p>
        </div>
      )}

      {!loading && filteredOrders.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Order #</th>
                <th style={{ minWidth: '200px' }}>Customer</th>
                <th style={{ minWidth: '110px' }}>Date</th>
                <th style={{ minWidth: '110px' }}>Total</th>
                <th style={{ minWidth: '140px' }}>Payment</th>
                <th style={{ minWidth: '120px' }}>Status</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="admin-td-order-no">
                    <Link href={`/admin/orders/${order.id}`} className="admin-btn-text" style={{ padding: 0 }}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="admin-td-customer">
                    <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>
                      {order.user.fullName || 'Customer'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>
                      {order.user.email}
                    </p>
                  </td>
                  <td className="admin-td-date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="admin-td-total">
                    ₹{Number(order.grandTotal).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)' }}>
                    {order.payment?.provider || order.paymentMethod || 'COD'} · {order.payment?.status || '—'}
                  </td>
                  <td className="admin-td-status">
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      borderRadius: '999px',
                      background: order.status === 'DELIVERED' ? '#ecfdf5' : order.status === 'CANCELLED' ? '#fdf2f2' : order.status === 'SHIPPED' ? '#eff6ff' : '#fef3c7',
                      color: order.status === 'DELIVERED' ? '#047857' : order.status === 'CANCELLED' ? '#b91c1c' : order.status === 'SHIPPED' ? '#1d4ed8' : '#b45309',
                      border: `1px solid ${order.status === 'DELIVERED' ? '#a7f3d0' : order.status === 'CANCELLED' ? '#fecaca' : order.status === 'SHIPPED' ? '#bfdbfe' : '#fde68a'}`,
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td className="admin-td-action">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="admin-btn admin-btn-primary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
