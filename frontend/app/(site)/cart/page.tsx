'use client';

import { useCart } from '../../../hooks/useCart';
import { Button } from '../../../components/ui/Button';

export default function CartPage() {
  const { cart, loading, mutating, error, updateQuantity, removeItem, subtotal } = useCart();

  if (loading) {
    return (
      <div className="site-shell" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--ff-charcoal-soft)' }}>
        Preparing your ritual…
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="site-shell" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '30rem', margin: '0 auto' }}>
          <p className="eyebrow">Your ritual</p>
          <h1 className="display-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', marginTop: '0.5rem' }}>
            Your bag is waiting.
          </h1>
          <p style={{ marginTop: '1rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.75 }}>
            Explore the collection and find something mindful to make space for.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <Button href="/shop">Shop now</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-shell" style={{ padding: '4rem 0 6rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="eyebrow">Your ritual</p>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}>
          Shopping bag
        </h1>
      </div>

      {error && (
        <p style={{ marginBottom: '1.5rem', color: 'var(--ff-burgundy)', fontSize: '0.9rem' }} role="alert">
          {error}
        </p>
      )}

      <div className="cart-layout">
        <section className="cart-items-panel">
          <div className="cart-item-list">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item-row">
                <div className="cart-item-info">
                  <p>{item.variant.product.name}</p>
                  <p>{item.variant.sizeLabel}</p>
                </div>

                <div className="cart-item-actions">
                  <div className="cart-qty-bar">
                    <button
                      type="button"
                      aria-label={item.quantity === 1 ? `Remove ${item.variant.product.name}` : 'Decrease quantity'}
                      title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={mutating}
                      className="cart-qty-btn"
                    >
                      −
                    </button>
                    <span className="cart-qty-count">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={mutating}
                      className="cart-qty-btn"
                    >
                      +
                    </button>
                  </div>

                  <span className="cart-item-total">
                    ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                  </span>

                  <button
                    type="button"
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

        <aside className="cart-summary">
          <p className="section-kicker" style={{ marginBottom: '1.25rem' }}>Order summary</p>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
          </div>
          <div className="summary-row muted">
            <span>Shipping</span>
            <strong>Calculated at checkout</strong>
          </div>
          <p className="summary-note">
            Taxes and courier shipping calculated at next step. Free delivery available on eligible orders.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <Button href="/checkout" className="btn-block">Proceed to checkout</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
