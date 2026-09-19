'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { getAccessToken } from '../../lib/api';

export function AddToCartButton({
  variantId,
  disabled = false,
}: {
  variantId: string;
  disabled?: boolean;
}) {
  const { cart, addItem, loading } = useCart();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const isInCart = Boolean(
    cart?.items.some(
      (item) => (item.variant?.id || item.variantId) === variantId && item.quantity > 0,
    ),
  );

  async function handleAdd() {
    if (!getAccessToken()) {
      setError('Sign in to add products to your cart.');
      return;
    }
    if (adding || disabled) return;
    setAdding(true);
    setError('');
    try {
      await addItem(variantId);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add this item');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="product-detail-cart-wrap">
      {!isInCart ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || adding || loading}
          className="product-detail-btn product-detail-add-btn"
          aria-label={adding ? 'Adding to cart' : 'Add to cart'}
        >
          {adding ? 'Adding...' : 'Add to cart'}
        </button>
      ) : (
        <div className="product-detail-btn-stack">
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || adding}
            className="product-detail-btn product-detail-add-btn is-added"
            aria-label="Added to cart"
            title="Click to add another to cart"
          >
            {adding ? 'Adding...' : 'Added to cart'}
          </button>
          <Link
            href="/cart"
            className="product-detail-go-btn"
            aria-label="Go to cart"
          >
            Go to cart
          </Link>
        </div>
      )}

      {error && (
        <p className="product-detail-error" role="alert">
          {error}{' '}
          {error.toLowerCase().includes('sign in') && (
            <Link href="/login" className="product-detail-error-link">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}