'use client';

import { useState } from 'react';
import { useCart } from '../../hooks/useCart';

export function CartProductActions({ variantId, stockQuantity }: { variantId: string; stockQuantity: number }) {
  const { cart, loading, addItem, updateQuantity } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const item = cart?.items.find((cartItem) => cartItem.variant.id === variantId);
  const quantity = item?.quantity ?? 0;

  async function changeQuantity(nextQuantity: number) {
    if (pending || loading || nextQuantity < 0 || nextQuantity > stockQuantity) return;
    setPending(true);
    setError('');
    try {
      if (!item) await addItem(variantId);
      else await updateQuantity(item.id, nextQuantity);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to update cart');
    } finally {
      setPending(false);
    }
  }

  if (quantity === 0) {
    return (
      <div className="cart-actions-wrap">
        <button
          type="button"
          onClick={() => changeQuantity(1)}
          disabled={pending || loading || stockQuantity < 1}
          className="cart-add-btn"
        >
          {pending ? 'Adding...' : 'Add to cart'}
        </button>
        {error && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--ff-burgundy)' }} role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="cart-actions-wrap">
      <div className="cart-qty-bar">
        <button
          type="button"
          aria-label={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
          title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
          onClick={() => changeQuantity(quantity - 1)}
          disabled={pending || loading}
          className="cart-qty-btn"
        >
          −
        </button>
        <span aria-live="polite" className="cart-qty-count">
          {pending ? '...' : quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => changeQuantity(quantity + 1)}
          disabled={pending || loading || quantity >= stockQuantity}
          className="cart-qty-btn"
        >
          +
        </button>
      </div>
      {error && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--ff-burgundy)' }} role="alert">{error}</p>}
    </div>
  );
}