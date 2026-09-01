'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// Guest carts are identified by a random token persisted in localStorage.
// (Not browser storage inside artifacts — this is the real Next.js app,
// where localStorage is fully supported.)
function getSessionToken(): string {
  const key = 'ff_cart_session';
  let token = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  if (!token) {
    token = crypto.randomUUID();
    if (typeof window !== 'undefined') localStorage.setItem(key, token);
  }
  return token;
}

interface CartItem {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sizeLabel: string;
    price: string;
    product: { name: string };
  };
}

interface Cart {
  id: string;
  items: CartItem[];
}

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionToken = getSessionToken();
      const data = await apiFetch<Cart>(`/cart?sessionToken=${sessionToken}`, {
        next: { revalidate: 0 },
      });
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      const sessionToken = getSessionToken();
      await apiFetch(`/cart/items?sessionToken=${sessionToken}`, {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      });
      await refresh();
    },
    [refresh],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      await apiFetch(`/cart/items/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await apiFetch(`/cart/items/${cartItemId}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  const subtotal =
    cart?.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0) ?? 0;

  return { cart, loading, addItem, updateQuantity, removeItem, subtotal, refresh };
}
