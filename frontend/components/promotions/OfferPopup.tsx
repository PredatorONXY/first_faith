'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import offerBanner from '../../img/First Faith 1+1 Skincare Offer.png';

const POPUP_SHOWN_KEY = 'first-faith-offer-popup-shown';

export function OfferPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pathname = usePathname();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
      } catch {
        // ignore storage errors
      }
    }
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 250);
  }, []);

  const handleShopClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
      } catch {
        // ignore storage errors
      }
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const isExcluded =
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/cart') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/track-order') ||
      pathname.startsWith('/auth');

    if (isExcluded) return;

    try {
      const alreadyShown = sessionStorage.getItem(POPUP_SHOWN_KEY);
      if (!alreadyShown) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 350);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore storage access errors
    }
  }, [pathname]);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard navigation: Escape key closes popup
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`offer-popup-backdrop ${isClosing ? 'is-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="1+1 Skincare Special Offer"
    >
      <div className={`offer-popup-card ${isClosing ? 'is-closing' : ''}`}>
        {/* Accessible close button in top-right */}
        <button
          type="button"
          className="offer-popup-close-btn"
          onClick={handleClose}
          aria-label="Close promotional offer"
        >
          <span aria-hidden="true">&times;</span>
        </button>

        {/* Clickable Banner Image */}
        <Link
          href="/shop"
          onClick={handleShopClick}
          className="offer-popup-banner-link"
          aria-label="Shop 1+1 Skincare Offer"
          tabIndex={0}
        >
          <div className="offer-popup-image-container">
            <Image
              src={offerBanner}
              alt="First Faith 1+1 Skincare Offer — Buy 1 Get 1 Free"
              priority
              quality={95}
              className="offer-popup-image"
              sizes="(max-width: 640px) 94vw, (max-width: 1024px) 580px, 640px"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </Link>

        {/* Promotional body */}
        <div className="offer-popup-body">
          <div className="offer-popup-text-block">
            <span className="brand-pill offer-popup-pill">Limited Period Offer</span>
            <h2 className="offer-popup-title">1 + 1 SKINCARE SPECIAL OFFER</h2>
            <p className="offer-popup-subtitle">BUY 1 GET 1 FREE</p>
            <p className="offer-popup-hint">
              Free companion product automatically added to your bag at ₹0
            </p>
          </div>

          <div className="offer-popup-actions">
            <Link
              href="/shop"
              onClick={handleShopClick}
              className="offer-popup-cta-btn"
              tabIndex={0}
            >
              SHOP 1+1 OFFER →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
