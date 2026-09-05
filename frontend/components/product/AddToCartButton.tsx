'use client';

import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { Button } from '../ui/Button';

export function AddToCartButton({ variantId, disabled = false }: { variantId: string; disabled?: boolean }) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      await addItem(variantId);
      setAdded(true);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Button type="button" onClick={handleAdd} disabled={disabled || adding}>
      {adding ? 'Adding...' : added ? 'Added to cart' : 'Add to cart'}
    </Button>
  );
}