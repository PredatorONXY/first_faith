import Link from 'next/link';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/ingredients', label: 'Ingredients' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  return (
    <header className="border-b border-stone bg-cream">
      <div className="mx-auto flex max-w-site items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-display text-2xl text-charcoal tracking-tight">
          First Faith
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-charcoal-soft transition-colors hover:text-burgundy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/account" aria-label="Account" className="text-sm text-charcoal-soft hover:text-burgundy">
            Account
          </Link>
          <Link href="/cart" aria-label="Cart" className="text-sm text-charcoal-soft hover:text-burgundy">
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}
