'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import brandMark from '../../img/IMG-20260831-WA0007.jpg';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/ingredients', label: 'Ingredients' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
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
              sizes="42px"
            />
          </span>
          <span className="brand-name">First Faith</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="/account" className="header-action-link">Account</Link>
          <Link href="/cart" className="header-action-link">Cart</Link>

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
            <Link key={link.href} href={link.href} className="mobile-link" onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/account" className="mobile-link" onClick={() => setMenuOpen(false)}>Account</Link>
          <Link href="/cart" className="mobile-link" onClick={() => setMenuOpen(false)}>Cart</Link>
        </div>
      )}
    </header>
  );
}
