'use client';

import { useCartContext, Cart, CartItem } from '../context/CartContext';

export type { Cart, CartItem };

// Retain { autoLoad?: boolean } signature for full backward compatibility
// across all components, while delegating to the single authoritative CartProvider.
export function useCart({ autoLoad = true }: { autoLoad?: boolean } = {}) {
  void autoLoad;
  return useCartContext();
}
