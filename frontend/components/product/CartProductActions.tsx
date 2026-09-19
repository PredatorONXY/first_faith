'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../../hooks/useCart';

export function CartProductActions({
  variantId,
  stockQuantity,
}: {
  variantId: string;
  stockQuantity: number;
}) {
  const { cart, loading, addItem } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const item = cart?.items.find(
    (cartItem) => (cartItem.variant?.id || cartItem.variantId) === variantId,
  );
  const isInCart = Boolean(item && item.quantity > 0);
  const isAvailable = stockQuantity > 0;

  async function handleAddToCart() {
    if (pending || loading || !isAvailable) return;
    setPending(true);
    setError('');
    try {
      await addItem(variantId);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to add to cart');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="cart-actions-wrap">
      {!isInCart ? (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={pending || loading || !isAvailable}
          className="cart-add-btn"
          aria-label={pending ? 'Adding to cart' : 'Add to cart'}
        >
          {pending ? 'Adding...' : 'Add to cart'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={pending || loading || (item?.quantity ?? 0) >= stockQuantity}
            className="cart-add-btn cart-added-btn"
            aria-label="Added to cart"
            title="Click to add another to cart"
          >
            {pending ? 'Adding...' : 'Added to cart'}
          </button>
          <Link
            href="/cart"
            className="cart-go-to-btn"
            aria-label="Go to cart"
          >
            Go to cart
          </Link>
        </>
      )}

      <p className="cart-stock-status" aria-live="polite">
        {isAvailable ? 'In stock · Ready to dispatch' : 'Currently unavailable'}
      </p>

      {error && (
        <p style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: 'var(--ff-burgundy)', textAlign: 'center' }} role="alert">
          {error}{' '}
          {error.toLowerCase().includes('sign in') && (
            <Link href="/login" style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--ff-burgundy)' }}>
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}