'use client';

import { useCart } from '../../../hooks/useCart';
import { Button } from '../../../components/ui/Button';

export default function CartPage() {
  const { cart, loading, mutating, error, updateQuantity, removeItem, subtotal } = useCart();

  if (loading) {
    return <div className="mx-auto max-w-site px-6 py-24 md:px-10 text-charcoal-soft">Preparing your ritual…</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-site px-6 py-28 text-center md:px-10">
        <div className="mx-auto max-w-lg">
          <p className="eyebrow">Your ritual</p>
          <h1 className="mt-4 font-display text-6xl leading-none text-charcoal">Your bag is waiting.</h1>
          <p className="mt-5 text-charcoal-soft">Explore the collection and find something to make space for.</p>
          <div className="mt-6">
            <Button href="/shop">Shop now</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-site px-6 py-12 md:px-10 md:py-20">
      <div className="mb-12"><p className="eyebrow">Your ritual</p><h1 className="mt-3 font-display text-6xl text-charcoal">Shopping bag</h1></div>
      {error && <p className="mb-5 text-sm text-burgundy" role="alert">{error}</p>}
      <div className="cart-layout">
        <section className="border-t border-stone">

          <div className="cart-item-list mt-2">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item-row">
                <div>
                  <p className="font-display text-xl text-charcoal">{item.variant.product.name}</p>
                  <p className="text-sm text-charcoal-soft">{item.variant.sizeLabel}</p>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-control">
                    <button
                      aria-label={item.quantity === 1 ? `Remove ${item.variant.product.name}` : 'Decrease quantity'}
                      title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={mutating}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={mutating}
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
                    disabled={mutating}
                    className="remove-link"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="cart-summary border-t border-stone bg-blush/45 p-6 md:p-8">
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
