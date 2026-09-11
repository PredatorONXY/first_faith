'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { getAccessToken } from '../../lib/api';
import { Button } from '../ui/Button';

export function AddToCartButton({ variantId, disabled = false }: { variantId: string; disabled?: boolean }) {
  const { addItem } = useCart({ autoLoad: false });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!getAccessToken()) {
      setError('Sign in to add products to your cart.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await addItem(variantId);
      setAdded(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add this item');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleAdd} disabled={disabled || adding}>
        {adding ? 'Adding...' : added ? 'Added to cart' : 'Add to cart'}
      </Button>
      {error && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--ff-burgundy)' }}>
          {error} <Link href="/login" style={{ textDecoration: 'underline', fontWeight: 600 }}>Log in</Link>
        </p>
      )}
    </div>
  );
}