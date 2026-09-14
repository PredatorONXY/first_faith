'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, clearAccessToken, getAccessToken, setAccessToken } from '../../lib/api';
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

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromQuery = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token')
      : null;
    const googleError = searchParams?.get('googleError');

    if (tokenFromQuery) {
      setAccessToken(tokenFromQuery);
      window.dispatchEvent(new Event('ff:auth-changed'));
      window.history.replaceState(null, '', '/account');
    }

    if (googleError) {
      setError(decodeURIComponent(googleError));
    }

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
  }, [router, searchParams]);

  function handleLogout() {
    clearAccessToken();
    window.dispatchEvent(new Event('ff:auth-changed'));
    router.push('/login');
  }

  if (loading) {
    return <main className="account-page"><div className="site-shell account-loading">Preparing your account…</div></main>;
  }

  if (!getAccessToken() || !profile) {
    return (
      <main className="account-page account-guest-page">
        <section className="site-shell account-guest-card">
          <p className="eyebrow">Your ritual, in one place</p>
          <h1 className="account-title">Your account</h1>
          <p className="account-intro">Keep your details close, revisit your orders, and make your next First Faith ritual feel effortless.</p>
          <div className="account-actions">
            <Button href="/login">Log in</Button>
            <Button href="/register" variant="outline">Register</Button>
          </div>
          {error && <p className="account-error" role="alert">{error}</p>}
          <div className="account-guest-notes"><span>Order history</span><span>Saved delivery details</span><span>Thoughtful updates</span></div>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="site-shell account-shell">
      <div className="account-heading">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="account-title">Welcome{profile.fullName ? `, ${profile.fullName}` : ''}</h1>
          <p className="account-intro">Manage your details and keep track of your First Faith orders.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleLogout}>Log out</Button>
      </div>

      {error && <p className="account-error">{error}</p>}

      <div className="account-grid">
        <section className="account-panel">
          <p className="eyebrow">Account overview</p><h2 style={{ marginTop: '.75rem' }}>Personal information</h2>
          <dl className="account-details">
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

        <section className="account-orders">
          <div className="account-orders-heading">
            <h2>Orders</h2>
            <Link href="/shop">Continue shopping</Link>
          </div>
          {orders.length === 0 ? (
            <div className="account-empty">
              <p>Nothing here yet.</p><span>When you place an order, its progress and details will appear here.</span><Button href="/shop" variant="outline">Explore the collection</Button>
            </div>
          ) : (
            <div className="account-order-list">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="account-order-card"
                >
                  <div className="account-order-card-inner">
                    <div>
                      <p className="account-order-number">{order.orderNumber}</p>
                      <p>{formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="account-order-total">
                      <p>{formatAmount(order.grandTotal)}</p>
                      <span>{order.status.toLowerCase()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<main className="account-page"><div className="site-shell account-loading">Preparing your account…</div></main>}>
      <AccountPageContent />
    </Suspense>
  );
}
