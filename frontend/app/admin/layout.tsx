import Link from 'next/link';

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
// SupabaseAuthGuard + RolesGuard(ADMIN, SUPER_ADMIN) — the frontend check
// is a convenience, not the security boundary.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-site gap-10 px-6 py-10 md:px-10">
      <aside className="w-48 shrink-0">
        <p className="font-display text-lg text-charcoal">Admin</p>
        <nav className="mt-6 space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-sm px-3 py-2 text-sm text-charcoal-soft hover:bg-blush-soft hover:text-charcoal"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
