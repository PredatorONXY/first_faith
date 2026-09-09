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
    return <div className="mt-5">
      <button type="button" onClick={() => changeQuantity(1)} disabled={pending || loading || stockQuantity < 1} className="w-full border border-burgundy px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-burgundy transition hover:bg-burgundy hover:text-white disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Adding...' : 'Add to cart'}
      </button>
      {error && <p className="mt-2 text-xs text-burgundy" role="alert">{error}</p>}
    </div>;
  }

  return <div className="mt-5">
    <div className="flex items-center justify-between border border-burgundy bg-blush/40">
      <button type="button" aria-label={quantity === 1 ? 'Remove item' : 'Decrease quantity'} title={quantity === 1 ? 'Remove item' : 'Decrease quantity'} onClick={() => changeQuantity(quantity - 1)} disabled={pending || loading} className="px-4 py-3 text-lg text-burgundy disabled:cursor-wait disabled:opacity-50">−</button>
      <span aria-live="polite" className="text-sm font-semibold text-charcoal">{pending ? '...' : quantity}</span>
      <button type="button" aria-label="Increase quantity" onClick={() => changeQuantity(quantity + 1)} disabled={pending || loading || quantity >= stockQuantity} className="px-4 py-3 text-lg text-burgundy disabled:cursor-wait disabled:opacity-50">+</button>
    </div>
    {error && <p className="mt-2 text-xs text-burgundy" role="alert">{error}</p>}
  </div>;
}