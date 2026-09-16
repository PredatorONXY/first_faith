'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminGate } from '../../components/admin/AdminGate';
import { clearAccessToken } from '../../lib/api';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  function handleLogout() {
    clearAccessToken();
    window.dispatchEvent(new Event('ff:auth-changed'));
    router.push('/admin/login');
  }

  return (
    <AdminGate>
      <div className="admin-shell site-shell">
        <aside className="admin-nav">
          <p style={{ fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--ff-burgundy)' }}>Administration</p>
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
