'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, clearAccessToken, extractErrorMessage, getAccessToken, setAccessToken } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { useCart } from '../../hooks/useCart';

type Profile = {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

type Address = {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

type WishlistItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    tagline?: string | null;
    images: Array<{ url: string; altText?: string | null }>;
    variants: Array<{ id: string; price: string | number; sizeLabel: string; isDefault?: boolean }>;
  };
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
  const { addItem } = useCart({ autoLoad: false });

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'wishlist'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Profile Modal State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
    phone: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Adding to cart state per item
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, ordersRes, addressesRes, wishlistRes] = await Promise.all([
        apiFetch<Profile>('/auth/me', { next: { revalidate: 0 } }),
        apiFetch<Order[]>('/orders', { next: { revalidate: 0 } }).catch(() => [] as Order[]),
        apiFetch<Address[]>('/auth/addresses', { next: { revalidate: 0 } }).catch(() => [] as Address[]),
        apiFetch<WishlistItem[]>('/wishlist', { next: { revalidate: 0 } }).catch(() => [] as WishlistItem[]),
      ]);
      setProfile(profileRes);
      setOrders(ordersRes);
      setAddresses(addressesRes);
      setWishlist(wishlistRes);
    } catch (err) {
      const message = extractErrorMessage(err, 'Unable to load your account');
      if (message.toLowerCase().includes('token') || message.toLowerCase().includes('session')) {
        clearAccessToken();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tokenFromQuery = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token')
      : null;
    const googleError = searchParams?.get('googleError');
    const tabParam = searchParams?.get('tab');

    if (tokenFromQuery) {
      setAccessToken(tokenFromQuery);
      window.dispatchEvent(new Event('ff:auth-changed'));
      window.history.replaceState(null, '', '/account');
    }

    if (googleError) {
      setError(decodeURIComponent(googleError));
    }

    if (tabParam === 'orders' || tabParam === 'addresses' || tabParam === 'wishlist') {
      setActiveTab(tabParam);
    }

    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    loadData();
  }, [searchParams, loadData]);

  function handleLogout() {
    clearAccessToken();
    window.dispatchEvent(new Event('ff:auth-changed'));
    router.push('/login');
  }

  // --- Profile Handlers ---
  function openEditProfile() {
    if (!profile) return;
    setProfileForm({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
    });
    setEditingProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await apiFetch<Profile>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: profileForm.fullName.trim() || undefined,
          phone: profileForm.phone.trim() || undefined,
        }),
      });
      setProfile(updated);
      setEditingProfile(false);
      showToast('Profile updated successfully.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  }

  // --- Address Handlers ---
  function openAddAddress() {
    setEditingAddressId(null);
    setAddressForm({
      label: 'Home',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
      phone: profile?.phone || '',
      isDefault: addresses.length === 0,
    });
    setAddressModalOpen(true);
  }

  function openEditAddress(addr: Address) {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || 'Home',
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || '',
      isDefault: addr.isDefault,
    });
    setAddressModalOpen(true);
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await apiFetch<Address>(`/auth/addresses/${editingAddressId}`, {
          method: 'PATCH',
          body: JSON.stringify(addressForm),
        });
        showToast('Address updated successfully.');
      } else {
        await apiFetch<Address>('/auth/addresses', {
          method: 'POST',
          body: JSON.stringify(addressForm),
        });
        showToast('Address added successfully.');
      }
      setAddressModalOpen(false);
      const updated = await apiFetch<Address[]>('/auth/addresses', { next: { revalidate: 0 } });
      setAddresses(updated);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save address.'));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!window.confirm('Are you sure you want to remove this address?')) return;
    try {
      await apiFetch(`/auth/addresses/${id}`, { method: 'DELETE' });
      setAddresses((cur) => cur.filter((a) => a.id !== id));
      showToast('Address deleted.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to delete address.'));
    }
  }

  async function handleSetDefaultAddress(id: string) {
    try {
      await apiFetch(`/auth/addresses/${id}/default`, { method: 'PATCH' });
      setAddresses((cur) =>
        cur.map((a) => ({
          ...a,
          isDefault: a.id === id,
        })),
      );
      showToast('Default address updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to set default address.'));
    }
  }

  // --- Wishlist Handlers ---
  async function handleRemoveFromWishlist(productId: string) {
    try {
      await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
      setWishlist((cur) => cur.filter((w) => w.productId !== productId));
      showToast('Removed from wishlist.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to remove item from wishlist.'));
    }
  }

  async function handleAddToCart(item: WishlistItem) {
    const variant = item.product.variants.find((v) => v.isDefault) || item.product.variants[0];
    if (!variant) {
      setError('Product variant not found.');
      return;
    }

    setAddingToCartId(item.productId);
    try {
      await addItem(variant.id, 1);
      showToast(`Added ${item.product.name} to cart.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to add to cart.'));
    } finally {
      setAddingToCartId(null);
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="site-shell account-loading">Preparing your account…</div>
      </main>
    );
  }

  if (!getAccessToken() || !profile) {
    return (
      <main className="account-page account-guest-page">
        <section className="site-shell account-guest-card">
          <p className="eyebrow">Your ritual, in one place</p>
          <h1 className="account-title">Your account</h1>
          <p className="account-intro">
            Keep your details close, revisit your orders, and make your next First Faith ritual feel effortless.
          </p>
          <div className="account-actions">
            <Button href="/login">Log in</Button>
            <Button href="/register" variant="outline">Register</Button>
          </div>
          {error && <p className="account-error" role="alert">{error}</p>}
          <div className="account-guest-notes">
            <span>Order history</span>
            <span>Saved delivery details</span>
            <span>Thoughtful updates</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="site-shell account-shell">
        {/* Header Heading */}
        <div className="account-heading">
          <div>
            <p className="eyebrow">Customer account</p>
            <h1 className="account-title">Welcome{profile.fullName ? `, ${profile.fullName}` : ''}</h1>
            <p className="account-intro">
              Manage your personal information, saved delivery addresses, wishlist, and past orders.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        {/* Global Feedback Notifications */}
        {error && (
          <div className="account-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        )}

        {toastMessage && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1.25rem',
              backgroundColor: 'rgba(74, 21, 33, 0.08)',
              border: '1px solid rgba(74, 21, 33, 0.2)',
              borderRadius: '8px',
              color: 'var(--ff-burgundy)',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '2rem',
            borderBottom: '1px solid rgba(32, 28, 27, 0.08)',
            overflowX: 'auto',
            paddingBottom: '0.2rem',
          }}
          aria-label="Account sections"
        >
          {[
            { id: 'overview', label: 'Overview & Profile' },
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'addresses', label: `Saved Addresses (${addresses.length})` },
            { id: 'wishlist', label: `Wishlist (${wishlist.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--ff-burgundy)' : '2px solid transparent',
                  padding: '0.65rem 0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--ff-burgundy)' : 'var(--ff-charcoal-soft)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW & PROFILE */}
        {activeTab === 'overview' && (
          <div className="account-grid">
            <section className="account-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">Account details</p>
                  <h2 style={{ marginTop: '0.25rem', fontSize: '1.6rem' }}>Personal profile</h2>
                </div>
                <Button variant="outline" onClick={openEditProfile} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                  Edit profile
                </Button>
              </div>

              <dl className="account-details">
                <div>
                  <dt className="text-charcoal-soft">Full name</dt>
                  <dd className="mt-1 text-charcoal" style={{ fontWeight: 500 }}>
                    {profile.fullName || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-soft">Email address</dt>
                  <dd className="mt-1 break-words text-charcoal" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{profile.email}</span>
                    {profile.emailVerified && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                        }}
                      >
                        Verified
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-soft">Phone number</dt>
                  <dd className="mt-1 text-charcoal">
                    {profile.phone || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-soft">Account type</dt>
                  <dd className="mt-1 text-charcoal">
                    <span style={{ textTransform: 'capitalize' }}>{profile.role.toLowerCase()}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal-soft">Member since</dt>
                  <dd className="mt-1 text-charcoal">{formatDate(profile.createdAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="account-orders">
              <div className="account-orders-heading">
                <h2>Recent activity</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  style={{ background: 'none', border: 'none', color: 'var(--ff-burgundy)', fontWeight: 600, cursor: 'pointer' }}
                >
                  View all orders ({orders.length}) →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="account-empty">
                  <p>No orders placed yet.</p>
                  <span>When you place your First Faith order, its status and tracking details will appear here.</span>
                  <Button href="/shop" variant="outline">
                    Explore the collection
                  </Button>
                </div>
              ) : (
                <div className="account-order-list">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="account-order-card"
                      style={{ padding: '1.25rem' }}
                    >
                      <div className="account-order-card-inner">
                        <div>
                          <p className="account-order-number" style={{ margin: 0, fontWeight: 600 }}>
                            Order #{order.orderNumber}
                          </p>
                          <p style={{ margin: '0.25rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.88rem' }}>
                            {formatDate(order.createdAt)}
                          </p>
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--ff-charcoal-soft)' }}>
                            {order.items.length} item{order.items.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--ff-charcoal)' }}>
                            {formatAmount(order.grandTotal)}
                          </p>
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '0.35rem',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              backgroundColor: order.status === 'DELIVERED' ? '#dcfce7' : 'rgba(74, 21, 33, 0.08)',
                              color: order.status === 'DELIVERED' ? '#15803d' : 'var(--ff-burgundy)',
                            }}
                          >
                            {order.status.toLowerCase()}
                          </span>
                          <div style={{ marginTop: '0.85rem' }}>
                            <Link
                              href={`/account/orders/${order.id}`}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              View Order
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div style={{ marginTop: '2.5rem' }}>
            <div className="account-orders-heading" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Order History</h2>
                <p style={{ color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
                  Track and inspect details for all your First Faith orders.
                </p>
              </div>
              <Link href="/shop" style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                Continue shopping
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="account-empty">
                <p>Nothing here yet.</p>
                <span>When you place an order, its progress and details will appear here.</span>
                <Button href="/shop" variant="outline">
                  Explore the collection
                </Button>
              </div>
            ) : (
              <div className="account-order-list" style={{ display: 'grid', gap: '1rem' }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="account-order-card"
                    style={{
                      border: '1px solid rgba(32, 28, 27, 0.08)',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.75)',
                      padding: '1.5rem',
                      boxShadow: '0 4px 20px rgba(32, 28, 27, 0.03)',
                    }}
                  >
                    <div className="account-order-card-inner">
                      <div>
                        <p className="account-order-number" style={{ margin: 0, fontWeight: 600 }}>
                          Order #{order.orderNumber}
                        </p>
                        <p style={{ margin: '0.3rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.9rem' }}>
                          {formatDate(order.createdAt)}
                        </p>
                        <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {order.items.map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--ff-charcoal)',
                                backgroundColor: 'rgba(32, 28, 27, 0.04)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {it.productName} × {it.quantity}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem', color: 'var(--ff-charcoal)' }}>
                            {formatAmount(order.grandTotal)}
                          </p>
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '0.35rem',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              backgroundColor: order.status === 'DELIVERED' ? '#dcfce7' : 'rgba(74, 21, 33, 0.08)',
                              color: order.status === 'DELIVERED' ? '#15803d' : 'var(--ff-burgundy)',
                            }}
                          >
                            {order.status.toLowerCase()}
                          </span>
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                          <Link
                            href={`/account/orders/${order.id}`}
                            className="btn btn-outline"
                            style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
                          >
                            View Order
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED ADDRESSES */}
        {activeTab === 'addresses' && (
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Saved Addresses</h2>
                <p style={{ color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
                  Manage delivery addresses for swift and seamless checkout.
                </p>
              </div>
              <Button onClick={openAddAddress} style={{ fontSize: '0.88rem' }}>
                + Add Address
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="account-empty">
                <p>No saved addresses.</p>
                <span>Add an address to ensure swift deliveries of your skincare formulations.</span>
                <Button onClick={openAddAddress} variant="outline">
                  Add your first address
                </Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      border: addr.isDefault ? '2px solid var(--ff-burgundy)' : '1px solid rgba(32, 28, 27, 0.1)',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.78)',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 16px rgba(32, 28, 27, 0.04)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ff-charcoal)' }}>
                          {addr.label || 'Delivery Address'}
                        </span>
                        {addr.isDefault && (
                          <span
                            style={{
                              backgroundColor: 'var(--ff-burgundy)',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Default
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.92rem', color: 'var(--ff-charcoal)', lineHeight: 1.6 }}>
                        <p style={{ margin: 0 }}>{addr.line1}</p>
                        {addr.line2 && <p style={{ margin: 0 }}>{addr.line2}</p>}
                        <p style={{ margin: 0 }}>
                          {addr.city}, {addr.state} — {addr.postalCode}
                        </p>
                        <p style={{ margin: 0, color: 'var(--ff-charcoal-soft)', fontSize: '0.85rem' }}>
                          India
                        </p>
                        {addr.phone && (
                          <p style={{ margin: '0.4rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.85rem' }}>
                            Phone: {addr.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.5rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid rgba(32, 28, 27, 0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.85rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditAddress(addr)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ff-burgundy)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8c2530',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Delete
                        </button>
                      </div>

                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ff-charcoal-soft)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WISHLIST */}
        {activeTab === 'wishlist' && (
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>My Wishlist</h2>
                <p style={{ color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem', fontSize: '0.92rem' }}>
                  Your curated collection of favorite botanical and clinical formulations.
                </p>
              </div>
              <Link href="/shop" style={{ color: 'var(--ff-burgundy)', fontWeight: 600, fontSize: '0.92rem' }}>
                Explore shop →
              </Link>
            </div>

            {wishlist.length === 0 ? (
              <div className="account-empty">
                <p>Your wishlist is empty.</p>
                <span>Save your favorite skincare rituals here to revisit or purchase anytime.</span>
                <Button href="/shop" variant="outline">
                  Browse products
                </Button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {wishlist.map((item) => {
                  const product = item.product;
                  const image = product.images?.[0]?.url || '/placeholder.png';
                  const defaultVariant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];
                  const price = defaultVariant ? defaultVariant.price : null;

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid rgba(32, 28, 27, 0.08)',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.75)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 16px rgba(32, 28, 27, 0.03)',
                      }}
                    >
                      <Link href={`/products/${product.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                        <div style={{ position: 'relative', width: '100%', height: '220px', backgroundColor: '#efeae4' }}>
                          <Image
                            src={image}
                            alt={product.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 768px) 100vw, 300px"
                          />
                        </div>
                        <div style={{ padding: '1.2rem 1.2rem 0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ff-charcoal)', fontWeight: 600 }}>
                            {product.name}
                          </h3>
                          {product.tagline && (
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--ff-charcoal-soft)' }}>
                              {product.tagline}
                            </p>
                          )}
                          <p style={{ margin: '0.5rem 0 0', fontWeight: 700, color: 'var(--ff-burgundy)', fontSize: '1.1rem' }}>
                            {price ? formatAmount(price) : 'Price unavailable'}
                          </p>
                        </div>
                      </Link>

                      <div style={{ padding: '0.85rem 1.2rem 1.2rem', display: 'grid', gap: '0.5rem' }}>
                        <Button
                          onClick={() => handleAddToCart(item)}
                          disabled={addingToCartId === item.productId || !defaultVariant}
                          style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                        >
                          {addingToCartId === item.productId ? 'Adding…' : 'Add to Cart'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromWishlist(item.productId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ff-charcoal-soft)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: '4px',
                            textAlign: 'center',
                          }}
                        >
                          Remove from wishlist
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: EDIT PROFILE */}
        {editingProfile && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(32, 28, 27, 0.45)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 24px 48px rgba(32, 28, 27, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--ff-charcoal)' }}>Edit Profile</h3>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--ff-charcoal-soft)' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="form-label" htmlFor="profile-fullName">
                    Full name
                  </label>
                  <input
                    id="profile-fullName"
                    className="form-input"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="profile-phone">
                    Phone number
                  </label>
                  <input
                    id="profile-phone"
                    className="form-input"
                    placeholder="10-digit Indian number"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Email address</label>
                  <input className="form-input" value={profile.email} disabled style={{ opacity: 0.65, cursor: 'not-allowed' }} />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)' }}>
                    Email and role cannot be changed.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button type="submit" disabled={savingProfile} style={{ flex: 1 }}>
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT ADDRESS */}
        {addressModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(32, 28, 27, 0.45)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '520px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 48px rgba(32, 28, 27, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--ff-charcoal)' }}>
                  {editingAddressId ? 'Edit Address' : 'Add Delivery Address'}
                </h3>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--ff-charcoal-soft)' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveAddress} style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <label className="form-label" htmlFor="addr-label">
                    Address label
                  </label>
                  <input
                    id="addr-label"
                    className="form-input"
                    placeholder="Home, Office, Apartment..."
                    value={addressForm.label}
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="addr-line1">
                    Address line 1 <span style={{ color: 'var(--ff-burgundy)' }}>*</span>
                  </label>
                  <input
                    id="addr-line1"
                    className="form-input"
                    placeholder="House number, flat, building"
                    value={addressForm.line1}
                    onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="addr-line2">
                    Address line 2
                  </label>
                  <input
                    id="addr-line2"
                    className="form-input"
                    placeholder="Street, area, landmark"
                    value={addressForm.line2}
                    onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" htmlFor="addr-city">
                      City <span style={{ color: 'var(--ff-burgundy)' }}>*</span>
                    </label>
                    <input
                      id="addr-city"
                      className="form-input"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="addr-state">
                      State <span style={{ color: 'var(--ff-burgundy)' }}>*</span>
                    </label>
                    <input
                      id="addr-state"
                      className="form-input"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" htmlFor="addr-pin">
                      PIN Code (6 digits) <span style={{ color: 'var(--ff-burgundy)' }}>*</span>
                    </label>
                    <input
                      id="addr-pin"
                      className="form-input"
                      pattern="^\d{6}$"
                      placeholder="e.g. 560001"
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="addr-phone">
                      Delivery Phone
                    </label>
                    <input
                      id="addr-phone"
                      className="form-input"
                      placeholder="10-digit mobile"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="addr-default"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--ff-burgundy)' }}
                  />
                  <label htmlFor="addr-default" style={{ fontSize: '0.88rem', color: 'var(--ff-charcoal)', cursor: 'pointer' }}>
                    Set as default delivery address
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <Button type="submit" disabled={savingAddress} style={{ flex: 1 }}>
                    {savingAddress ? 'Saving…' : 'Save address'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setAddressModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
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
