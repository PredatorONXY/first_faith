'use client';

import Link from 'next/link';
import { useCart } from '../../../hooks/useCart';
import { Button } from '../../../components/ui/Button';

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, subtotal } = useCart();

  if (loading) {
    return <div className="mx-auto max-w-site px-6 py-16 md:px-10 text-charcoal-soft">Loading cart…</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-site px-6 py-20 text-center md:px-10">
        <h1 className="font-display text-2xl text-charcoal">Your cart is empty</h1>
        <p className="mt-2 text-charcoal-soft">Explore the collection and find something you'll love.</p>
        <div className="mt-6">
          <Button href="/shop">Shop now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-site px-6 py-16 md:px-10">
      <h1 className="font-display text-3xl text-charcoal">Your cart</h1>

      <div className="mt-8 divide-y divide-stone border-y border-stone">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-5">
            <div>
              <p className="font-medium text-charcoal">{item.variant.product.name}</p>
              <p className="text-sm text-charcoal-soft">{item.variant.sizeLabel}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-8 w-8 rounded-sm border border-stone text-charcoal hover:border-burgundy"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 rounded-sm border border-stone text-charcoal hover:border-burgundy"
                >
                  +
                </button>
              </div>

              <span className="w-20 text-right font-medium text-charcoal">
                ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
              </span>

              <button
                aria-label="Remove item"
                onClick={() => removeItem(item.id)}
                className="text-sm text-charcoal-soft hover:text-burgundy"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-charcoal-soft">Subtotal</span>
        <span className="text-xl font-medium text-charcoal">₹{subtotal.toLocaleString('en-IN')}</span>
      </div>
      <p className="mt-1 text-xs text-charcoal-soft">Shipping and taxes calculated at checkout.</p>

      <div className="mt-6 flex justify-end">
        <Button href="/checkout">Proceed to checkout</Button>
      </div>
    </div>
  );
}
