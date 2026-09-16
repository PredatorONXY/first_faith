'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type User = {
  id: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<User[]>('/admin/users')
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load customers');
        setLoading(false);
      });
  }, []);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term))
    );
  });

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>Customer Directory</p>
        <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', marginTop: '0.25rem' }}>
          Customers
        </h1>
      </div>

      <div style={{ marginTop: '1.5rem', maxWidth: '420px' }}>
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ width: '100%' }}
        />
      </div>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ marginTop: '2rem', color: 'var(--ff-charcoal-soft)' }}>Loading customer directory…</p>}

      {!loading && filteredUsers.length === 0 && (
        <div style={{ marginTop: '2rem', padding: '3rem 1.5rem', textAlign: 'center', border: '1px solid var(--ff-stone)', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
          <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)' }}>No customers match your search</p>
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Customer Name</th>
                <th style={{ minWidth: '220px' }}>Email</th>
                <th style={{ minWidth: '130px' }}>Phone</th>
                <th style={{ minWidth: '130px' }}>Role</th>
                <th style={{ minWidth: '120px' }}>Joined Date</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600, color: 'var(--ff-charcoal)' }}>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="admin-btn-text"
                      style={{ padding: 0 }}
                    >
                      {user.fullName || 'Unnamed Customer'}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--ff-charcoal)' }}>{user.email}</td>
                  <td style={{ color: 'var(--ff-charcoal-soft)' }}>{user.phone || '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      borderRadius: '999px',
                      background: user.role === 'SUPER_ADMIN' ? '#f3e8ff' : user.role === 'ADMIN' ? '#eff6ff' : 'rgba(238,216,207,0.4)',
                      color: user.role === 'SUPER_ADMIN' ? '#7e22ce' : user.role === 'ADMIN' ? '#1d4ed8' : 'var(--ff-charcoal)',
                      border: `1px solid ${user.role === 'SUPER_ADMIN' ? '#d8b4fe' : user.role === 'ADMIN' ? '#bfdbfe' : 'var(--ff-stone)'}`,
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link
                      href={`/admin/users/${user.id}`}
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
