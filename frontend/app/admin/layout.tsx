'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminGate } from '../../components/admin/AdminGate';
import { apiFetch, clearAccessToken } from '../../lib/api';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
];

type AdminNotif = {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotifResponse = {
  notifications: AdminNotif[];
  unreadCount: number;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    apiFetch<NotifResponse>('/admin/notifications')
      .then((res) => {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch(() => {
        // Silently handle if unauthenticated or error
      });
  }, [pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  function handleLogout() {
    clearAccessToken();
    window.dispatchEvent(new Event('ff:auth-changed'));
    router.push('/admin/login');
  }

  async function handleNotificationClick(notif: AdminNotif) {
    if (!notif.isRead) {
      try {
        await apiFetch(`/admin/notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue navigation regardless
      }
    }
    setShowNotifs(false);
    if (notif.orderId) {
      router.push(`/admin/orders/${notif.orderId}`);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/admin/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }

  return (
    <AdminGate>
      <div className="admin-shell site-shell">
        <aside className="admin-nav">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 600, letterSpacing: '0.05em', color: 'var(--ff-burgundy)', margin: 0 }}>
              Administration
            </p>
            {/* Notification Bell Badge */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                style={{
                  position: 'relative',
                  background: 'none',
                  border: '1px solid var(--ff-stone)',
                  borderRadius: '999px',
                  padding: '0.35rem 0.6rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: unreadCount > 0 ? 'var(--ff-burgundy)' : 'var(--ff-charcoal-soft)',
                }}
                aria-label="Admin notifications"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--ff-burgundy)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.4rem',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Flyout Modal */}
              {showNotifs && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    left: 0,
                    width: '300px',
                    maxWidth: '85vw',
                    background: '#ffffff',
                    border: '1px solid var(--ff-stone)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    padding: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(32,28,27,0.08)',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ff-charcoal)' }}>
                      Order Alerts
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.7rem',
                          color: 'var(--ff-burgundy)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p style={{ margin: '1rem 0', fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', textAlign: 'center' }}>
                      No order notifications yet.
                    </p>
                  ) : (
                    <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: notif.isRead ? 'transparent' : 'rgba(238,216,207,0.25)',
                            border: `1px solid ${notif.isRead ? 'transparent' : 'var(--ff-stone)'}`,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: notif.isRead ? 600 : 700, color: 'var(--ff-charcoal)' }}>
                              {notif.title}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--ff-charcoal-soft)' }}>
                              {new Date(notif.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <p style={{ margin: '0.2rem 0 0', color: 'var(--ff-charcoal-soft)', lineHeight: 1.4 }}>
                            {notif.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <nav style={{ display: 'grid', gap: '0.5rem' }}>
            {ADMIN_NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link ${isActive ? 'font-semibold text-burgundy' : ''}`}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'rgba(128, 0, 32, 0.06)' : 'transparent',
                    display: 'block',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="admin-nav-link text-left"
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ff-burgundy)',
                fontWeight: 600,
                textAlign: 'left',
                width: '100%',
                marginTop: '1rem',
                borderTop: '1px solid rgba(32, 28, 27, 0.08)',
                paddingTop: '1rem',
              }}
            >
              Sign out
            </button>
          </nav>
        </aside>
        <div className="admin-content" style={{ minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>{children}</div>
      </div>
    </AdminGate>
  );
}
