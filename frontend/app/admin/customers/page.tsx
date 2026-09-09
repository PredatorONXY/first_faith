'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type User = { id: string; fullName?: string | null; email: string; phone?: string | null; role: string; createdAt: string };

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<User[]>('/admin/users').then(setUsers).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load customers')); }, []);
  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><p className="eyebrow">Administration</p><h1 className="mt-3 font-display text-5xl text-charcoal">Customers</h1>{error ? <p className="mt-8 text-burgundy">{error}</p> : <div className="mt-10 overflow-x-auto border border-stone bg-white/60"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-stone text-xs uppercase tracking-[0.14em] text-charcoal-soft"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4">Role</th><th className="p-4">Joined</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-stone last:border-0"><td className="p-4"><Link href={`/admin/users/${user.id}`} className="text-burgundy underline underline-offset-4">{user.fullName || 'Unnamed customer'}</Link></td><td className="p-4">{user.email}</td><td className="p-4">{user.phone || '—'}</td><td className="p-4">{user.role}</td><td className="p-4">{new Date(user.createdAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}</main>;
}
