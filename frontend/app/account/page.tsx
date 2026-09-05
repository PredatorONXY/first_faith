'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAccessToken, getAccessToken } from '../../lib/api';
import { Button } from '../../components/ui/Button';

type Profile = {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
  createdAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string | number;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value: string | number) {
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadAccount() {
      try {
        const [profileResult, ordersResult] = await Promise.all([
          apiFetch<Profile>('/auth/me', { next: { revalidate: 0 } }),
          apiFetch<Order[]>('/orders', { next: { revalidate: 0 } }),
        ]);
        if (active) {
          setProfile(profileResult);
          setOrders(ordersResult);
        }
      } catch (accountError) {
        if (!active) return;
        const message = accountError instanceof Error ? accountError.message : 'Unable to load your account';
        if (message.toLowerCase().includes('token') || message.toLowerCase().includes('session')) {
          clearAccessToken();
        }
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();
    return () => {
      active = false;
    };
  }, []);

  function handleLogout() {
    clearAccessToken();
    router.push('/login');
  }

  if (loading) {
    return <div className="mx-auto max-w-site px-6 py-24 text-charcoal-soft md:px-10">Preparing your account…</div>;
  }

  if (!getAccessToken() || !profile) {
    return (
      <div className="mx-auto max-w-lg px-6 py-28 text-center">
        <p className="eyebrow">Your ritual</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-charcoal">Your account</h1>
        <p className="mt-4 text-charcoal-soft">Log in to view your profile and order history.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/login">Log in</Button>
          <Button href="/register" variant="outline">Register</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-site px-6 py-12 md:px-10 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-3 font-display text-6xl leading-none text-charcoal">Welcome{profile.fullName ? `, ${profile.fullName}` : ''}</h1>
          <p className="mt-3 text-charcoal-soft">Manage your details and keep track of your First Faith orders.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleLogout}>Log out</Button>
      </div>

      {error && <p className="mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="border-t border-stone bg-white/35 p-6 md:p-8">
          <p className="eyebrow">Account overview</p><h2 className="mt-3 font-display text-3xl text-charcoal">Personal information</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-charcoal-soft">Name</dt>
              <dd className="mt-1 text-charcoal">{profile.fullName || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-charcoal-soft">Email</dt>
              <dd className="mt-1 break-words text-charcoal">{profile.email}</dd>
            </div>
          </dl>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl text-charcoal">Orders</h2>
            <Link href="/shop" className="text-sm text-burgundy hover:text-burgundy-dark">Continue shopping</Link>
          </div>
          {orders.length === 0 ? (
            <div className="mt-6 border border-stone bg-white/60 p-6 text-sm text-charcoal-soft">
              You have no orders yet.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block border border-stone bg-white/55 p-5 transition-all hover:-translate-y-0.5 hover:border-burgundy"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-display text-xl text-charcoal">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-charcoal-soft">{formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-charcoal">{formatAmount(order.grandTotal)}</p>
                      <p className="mt-1 text-sm capitalize text-burgundy">{order.status.toLowerCase()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
