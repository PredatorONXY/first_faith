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
    price: string | number;
    inventory?: { stockQuantity: number } | null;
    product: { name: string; slug?: string };
  };
}

export interface CartPromotionOffer {
  offerId: string;
  offerName: string;
  buyProductSlug: string;
  buyProductName: string;
  buyQuantity: number;
  freeProductSlug: string;
  freeProductName: string;
  freeQuantity: number;
  unitPrice: number;
  discount: number;
}

export interface CartPromotionData {
  id: string;
  name: string;
  isActive: boolean;
  discountTotal: number;
  appliedOffers: CartPromotionOffer[];
  itemDiscounts?: Record<string, {
    freeQuantity: number;
    isFreeItem: boolean;
    discountAmount: number;
    unitPrice: number;
  }>;
  missingFreeItems?: Array<{
    offerId: string;
    buyProductSlug: string;
    buyProductName: string;
    freeProductSlug: string;
    freeProductName: string;
    quantityEligible: number;
  }>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal?: number;
  discountTotal?: number;
  taxableAmount?: number;
  taxRate?: number;
  taxTotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  grandTotal?: number;
  promotion?: CartPromotionData;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  mutating: boolean;
  error: string;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxRate: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  promotion: CartPromotionData | null;
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

    // Verify and sync with database for guest or authenticated visitor
    refresh().catch(() => {});

    const onAuthChanged = () => {
      refresh().catch(() => {});
    };

    const onFocus = () => {
      refresh().catch(() => {});
    };

    window.addEventListener('ff:auth-changed', onAuthChanged);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('ff:auth-changed', onAuthChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const subtotal = useMemo(() => {
    return cart?.subtotal ?? (cart?.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0) ?? 0);
  }, [cart]);

  const discountTotal = useMemo(() => {
    return cart?.discountTotal ?? (cart?.promotion?.discountTotal ?? 0);
  }, [cart]);

  const netPayable = useMemo(() => {
    return Math.max(subtotal - discountTotal, 0);
  }, [subtotal, discountTotal]);

  const taxRate = useMemo(() => {
    return cart?.taxRate ?? 18;
  }, [cart]);

  const taxableAmount = useMemo(() => {
    if (cart?.taxableAmount !== undefined && cart?.taxableAmount !== null) {
      return cart.taxableAmount;
    }
    const netPaise = Math.round(netPayable * 100);
    const taxablePaise = Math.round((netPaise * 100) / (100 + taxRate));
    return Number((taxablePaise / 100).toFixed(2));
  }, [cart, netPayable, taxRate]);

  const taxTotal = useMemo(() => {
    if (cart?.taxTotal !== undefined && cart?.taxTotal !== null) {
      return cart.taxTotal;
    }
    return Number((netPayable - taxableAmount).toFixed(2));
  }, [cart, netPayable, taxableAmount]);

  const cgst = useMemo(() => cart?.cgst ?? Number((taxTotal / 2).toFixed(2)), [cart, taxTotal]);
  const sgst = useMemo(() => cart?.sgst ?? Number((taxTotal - cgst).toFixed(2)), [cart, taxTotal, cgst]);
  const igst = useMemo(() => cart?.igst ?? 0, [cart]);

  const grandTotal = useMemo(() => {
    return cart?.grandTotal ?? netPayable;
  }, [cart, netPayable]);

  const promotion = useMemo(() => {
    return cart?.promotion ?? null;
  }, [cart]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      mutating,
      error,
      subtotal,
      discountTotal,
      taxableAmount,
      taxRate,
      taxTotal,
      cgst,
      sgst,
      igst,
      grandTotal,
      promotion,
      addItem,
      updateQuantity,
      removeItem,
      refresh,
      clear,
    }),
    [
      cart,
      loading,
      mutating,
      error,
      subtotal,
      discountTotal,
      taxableAmount,
      taxRate,
      taxTotal,
      cgst,
      sgst,
      igst,
      grandTotal,
      promotion,
      addItem,
      updateQuantity,
      removeItem,
      refresh,
      clear,
    ],
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
