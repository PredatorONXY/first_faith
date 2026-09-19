'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getAccessToken } from '../lib/api';

export interface CartItem {
  id: string;
  cartId?: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    sizeLabel: string;
    price: string;
    inventory?: { stockQuantity: number } | null;
    product: { name: string; slug?: string };
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  mutating: boolean;
  error: string;
  subtotal: number;
  addItem: (variantId: string, quantity?: number) => Promise<Cart>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<Cart>;
  removeItem: (cartItemId: string) => Promise<Cart>;
  refresh: () => Promise<void>;
  clear: () => void;
}

const CART_CACHE_KEY = 'first-faith-cart-cache';

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setCart(null);
      try {
        localStorage.removeItem(CART_CACHE_KEY);
      } catch {}
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<Cart>('/cart', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      setCart(data);
      try {
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify(data));
      } catch {}
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setCart(null);
    try {
      localStorage.removeItem(CART_CACHE_KEY);
    } catch {}
  }, []);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    if (!getAccessToken()) {
      throw new Error('Please sign in before adding items to your cart');
    }
    setMutating(true);
    try {
      const nextCart = await apiFetch<Cart>('/cart/items', {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ variantId, quantity }),
      });
      setCart(nextCart);
      try {
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify(nextCart));
      } catch {}
      setError('');
      return nextCart;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to add to cart';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    setMutating(true);
    try {
      const nextCart = await apiFetch<Cart>(`/cart/items/${cartItemId}`, {
        method: 'PATCH',
        cache: 'no-store',
        body: JSON.stringify({ quantity }),
      });
      setCart(nextCart);
      try {
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify(nextCart));
      } catch {}
      setError('');
      return nextCart;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update cart';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    setMutating(true);
    try {
      const nextCart = await apiFetch<Cart>(`/cart/items/${cartItemId}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      setCart(nextCart);
      try {
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify(nextCart));
      } catch {}
      setError('');
      return nextCart;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to remove item';
      setError(msg);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  // Initial rehydration from localStorage + authoritative sync with backend
  useEffect(() => {
    // Synchronous rehydration from localStorage on client mount
    try {
      const cached = localStorage.getItem(CART_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.items)) {
          setCart(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // Verify and sync with database if user is signed in
    if (getAccessToken()) {
      refresh().catch(() => {});
    } else {
      setCart(null);
      try {
        localStorage.removeItem(CART_CACHE_KEY);
      } catch {}
      setLoading(false);
    }

    const onAuthChanged = () => {
      if (getAccessToken()) {
        refresh().catch(() => {});
      } else {
        clear();
        setLoading(false);
      }
    };

    const onFocus = () => {
      if (getAccessToken()) {
        refresh().catch(() => {});
      }
    };

    window.addEventListener('ff:auth-changed', onAuthChanged);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('ff:auth-changed', onAuthChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [clear, refresh]);

  const subtotal = useMemo(() => {
    return cart?.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0) ?? 0;
  }, [cart]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      mutating,
      error,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      refresh,
      clear,
    }),
    [cart, loading, mutating, error, subtotal, addItem, updateQuantity, removeItem, refresh, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
