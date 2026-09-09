'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { getAccessToken } from '../lib/api';

interface CartItem {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sizeLabel: string;
    price: string;
      inventory?: { stockQuantity: number } | null;
    product: { name: string };
  };
}

interface Cart {
  id: string;
  items: CartItem[];
}

let sharedCart: Cart | null = null;
let cartRevision = 0;
let mutationQueue = Promise.resolve();
let refreshPromise: Promise<Cart> | null = null;

function publishCart(nextCart: Cart | null) {
  sharedCart = nextCart;
  cartRevision += 1;
  window.dispatchEvent(new Event('ff:cart-state-changed'));
}

export function useCart({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  const [cart, setCart] = useState<Cart | null>(sharedCart);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const revisionRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      publishCart(null);
      setCart(null);
      setLoading(false);
      return;
    }
    const requestRevision = cartRevision;
    revisionRef.current = requestRevision;
    setLoading(true);
    try {
      refreshPromise ??= apiFetch<Cart>('/cart', { next: { revalidate: 0 } }).finally(() => {
        refreshPromise = null;
      });
      const data = await refreshPromise;
      if (requestRevision === cartRevision) {
        sharedCart = data;
        setCart(data);
      }
      setError('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncCart = () => setCart(sharedCart);
    window.addEventListener('ff:cart-state-changed', syncCart);
    window.addEventListener('ff:cart-changed', refresh);
    if (autoLoad) refresh().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load cart'));
    return () => {
      window.removeEventListener('ff:cart-state-changed', syncCart);
      window.removeEventListener('ff:cart-changed', refresh);
    };
  }, [autoLoad, refresh]);

  const runMutation = useCallback(async (operation: () => Promise<Cart>) => {
    setMutating(true);
    const nextMutation = mutationQueue.then(operation);
    mutationQueue = nextMutation.then(() => undefined, () => undefined);
    try {
      const nextCart = await nextMutation;
      cartRevision += 1;
      sharedCart = nextCart;
      setCart(nextCart);
      setError('');
      window.dispatchEvent(new Event('ff:cart-state-changed'));
      window.dispatchEvent(new Event('ff:cart-changed'));
      return nextCart;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to update cart');
      throw mutationError;
    } finally {
      setMutating(false);
    }
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      if (!getAccessToken()) throw new Error('Please sign in before adding items to your cart');
      return runMutation(() => apiFetch<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }));
    },
    [runMutation],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      return runMutation(() => apiFetch<Cart>(`/cart/items/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }));
    },
    [runMutation],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      return runMutation(() => apiFetch<Cart>(`/cart/items/${cartItemId}`, { method: 'DELETE' }));
    },
    [runMutation],
  );

  const subtotal =
    cart?.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0) ?? 0;

  return { cart, loading, mutating, error, addItem, updateQuantity, removeItem, subtotal, refresh };
}
