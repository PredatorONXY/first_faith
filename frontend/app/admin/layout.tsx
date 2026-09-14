import Link from 'next/link';
import { AdminGate } from '../../components/admin/AdminGate';

const ADMIN_NAV = [
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/settings', label: 'Settings' },
];

// NOTE: this layout provides navigation only. The actual access control
// happens twice: (1) middleware/client check redirects non-admins away from
// /admin/* for UX, and (2) every backend endpoint under here is guarded by
// JwtAuthGuard + RolesGuard(ADMIN, SUPER_ADMIN) — the frontend check
// is a convenience, not the security boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
    <div className="admin-shell site-shell">
      <aside className="admin-nav">
        <p>Administration</p>
        <nav>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="admin-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
    </AdminGate>
  );
}
