'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import brandMark from '../../img/logo_main.png';
import { usePathname } from 'next/navigation';
import { useCart } from '../../hooks/useCart';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/ingredients', label: 'Ingredients' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const { cart, refresh } = useCart();
  const cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  useEffect(() => {
    const handleCartSync = () => {
      refresh().catch(() => {});
    };
    window.addEventListener('ff:auth-changed', handleCartSync);
    return () => {
      window.removeEventListener('ff:auth-changed', handleCartSync);
    };
  }, [refresh]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 8;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header-shell ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="site-shell header-inner">
        <Link href="/" className="brand-lockup" aria-label="First Faith home">
          <span className="brand-mark-wrap">
            <Image
              src={brandMark}
              alt="First Faith"
              fill
              className="object-contain"
              sizes="44px"
              priority
            />
          </span>
          <span className="brand-name">First Faith</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${currentPath.startsWith(link.href) ? 'is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/shop"
            className="nav-promo-pill"
            aria-label="1+1 Skincare Offer"
          >
            1+1 OFFER
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            href="/track-order"
            className={`header-action-link ${currentPath.startsWith('/track-order') ? 'is-active' : ''}`}
          >
            Track Order
          </Link>
          <Link
            href="/cart"
            className={`header-action-link ${currentPath.startsWith('/cart') ? 'is-active' : ''}`}
          >
            Cart
            {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-panel">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/shop"
            className="mobile-link mobile-promo-item"
            onClick={() => setMenuOpen(false)}
          >
            🎁 1+1 Skincare Offer
          </Link>
          <Link
            href="/track-order"
            className={`mobile-link ${currentPath.startsWith('/track-order') ? 'is-active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Track Order
          </Link>
          <Link href="/cart" className="mobile-link" onClick={() => setMenuOpen(false)}>
            Cart {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
          </Link>
        </div>
      )}
    </header>
  );
}
