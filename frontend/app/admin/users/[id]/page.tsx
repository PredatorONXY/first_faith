'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';

type Customer = {
  id: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
  addresses: Array<{
    id: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string | null;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: string;
    createdAt?: string;
    payment?: { status: string } | null;
    items: Array<{ productName: string; variantLabel: string; quantity: number; unitPrice: string }>;
  }>;
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;
    apiFetch<Customer>(`/admin/users/${params.id}`)
      .then(setCustomer)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load customer'));
  }, [params?.id]);

  if (error) {
    return (
      <div style={{ padding: '3rem 0' }}>
        <p style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>{error}</p>
        <Link href="/admin/customers" className="admin-btn-text" style={{ marginTop: '1rem', display: 'inline-block' }}>
          ← Back to customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return <div style={{ padding: '3rem 0', color: 'var(--ff-charcoal-soft)' }}>Loading customer profile…</div>;
  }

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div>
        <Link href="/admin/customers" className="admin-btn-text" style={{ padding: 0 }}>
          ← Back to customers
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.75rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', margin: 0 }}>
              {customer.fullName || 'Unnamed Customer'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.25rem' }}>
              {customer.email} {customer.phone ? `· ${customer.phone}` : ''}
            </p>
          </div>
          <span style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '999px',
            background: customer.role === 'SUPER_ADMIN' ? '#f3e8ff' : customer.role === 'ADMIN' ? '#eff6ff' : 'rgba(238,216,207,0.4)',
            color: customer.role === 'SUPER_ADMIN' ? '#7e22ce' : customer.role === 'ADMIN' ? '#1d4ed8' : 'var(--ff-charcoal)',
            border: `1px solid ${customer.role === 'SUPER_ADMIN' ? '#d8b4fe' : customer.role === 'ADMIN' ? '#bfdbfe' : 'var(--ff-stone)'}`,
          }}>
            Role: {customer.role}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Saved Addresses */}
        <section className="admin-card">
          <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0, paddingBottom: '0.75rem', borderBottom: '1px solid var(--ff-stone)' }}>
            Saved Addresses ({customer.addresses.length})
          </h2>
          {customer.addresses.length === 0 ? (
            <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--ff-charcoal-soft)' }}>
              No saved addresses on file.
            </p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              {customer.addresses.map((address) => (
                <div key={address.id} style={{ border: '1px solid var(--ff-stone)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>{address.line1}</p>
                  {address.line2 && <p style={{ margin: 0 }}>{address.line2}</p>}
                  <p style={{ margin: 0 }}>{address.city}, {address.state} {address.postalCode}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem', margin: 0 }}>
                    Country: {address.country} {address.phone ? `· Tel: ${address.phone}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Order History */}
        <section className="admin-card">
          <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)', margin: 0, paddingBottom: '0.75rem', borderBottom: '1px solid var(--ff-stone)' }}>
            Order History ({customer.orders.length})
          </h2>
          {customer.orders.length === 0 ? (
            <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--ff-charcoal-soft)' }}>
              No orders placed by this customer yet.
            </p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {customer.orders.map((order) => (
                <div key={order.id} style={{ border: '1px solid var(--ff-stone)', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(32,28,27,0.08)' }}>
                    <Link href={`/admin/orders/${order.id}`} className="admin-btn-text" style={{ padding: 0, fontWeight: 600 }}>
                      {order.orderNumber}
                    </Link>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ff-charcoal)' }}>₹{Number(order.grandTotal).toLocaleString('en-IN')}</span>
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(238,216,207,0.4)',
                        color: 'var(--ff-charcoal)',
                        fontWeight: 600,
                        border: '1px solid var(--ff-stone)',
                      }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)' }}>
                    {order.items.map((item, idx) => (
                      <p key={`${order.id}-${idx}`} style={{ margin: 0 }}>
                        {item.productName} ({item.variantLabel}) × {item.quantity} at ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                      </p>
                    ))}
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
