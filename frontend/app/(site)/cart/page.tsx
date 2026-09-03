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
        <div className="empty-cart-box">
          <p className="section-kicker">Your bag</p>
          <h1 className="font-display text-2xl text-charcoal">Your cart is empty</h1>
          <p className="mt-2 text-charcoal-soft">Explore the collection and find something you'll love.</p>
          <div className="mt-6">
            <Button href="/shop">Shop now</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-site px-6 py-16 md:px-10">
      <div className="cart-layout">
        <section className="cart-items-panel premium-card">
          <p className="section-kicker product-section-kicker">Shopping bag</p>
          <h1 className="font-display text-3xl text-charcoal">Your cart</h1>

          <div className="cart-item-list">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item-row">
                <div>
                  <p className="font-medium text-charcoal">{item.variant.product.name}</p>
                  <p className="text-sm text-charcoal-soft">{item.variant.sizeLabel}</p>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-control">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <span className="cart-item-total">
                    ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                  </span>

                  <button
                    aria-label="Remove item"
                    onClick={() => removeItem(item.id)}
                    className="remove-link"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="cart-summary premium-card">
          <p className="section-kicker product-section-kicker">Summary</p>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
          </div>
          <div className="summary-row muted">
            <span>Shipping</span>
            <strong>Calculated at checkout</strong>
          </div>
          <p className="summary-note">Shipping and taxes calculated at checkout.</p>
          <div className="mt-6">
            <Button href="/checkout" className="w-full">Proceed to checkout</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
