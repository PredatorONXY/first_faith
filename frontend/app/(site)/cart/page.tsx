'use client';

import { useCart } from '../../../hooks/useCart';
import { Button } from '../../../components/ui/Button';

export default function CartPage() {
  const {
    cart,
    loading,
    mutating,
    error,
    updateQuantity,
    removeItem,
    subtotal,
    discountTotal,
    taxableAmount,
    taxTotal,
    grandTotal,
    promotion,
  } = useCart();

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

      {promotion?.isActive && (
        <div
          style={{
            background: 'rgba(238, 216, 207, 0.45)',
            border: '1.5px solid rgba(124, 40, 54, 0.25)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>🎁</span>
          <div>
            <strong style={{ color: 'var(--ff-burgundy)', fontSize: '0.95rem' }}>
              {promotion.name} Activated!
            </strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--ff-charcoal)', lineHeight: 1.5 }}>
              You are saving ₹{discountTotal.toLocaleString('en-IN')} on your qualifying companion rituals.
            </p>
          </div>
        </div>
      )}

      <div className="cart-layout">
        <section className="cart-items-panel">
          <div className="cart-item-list">
            {cart.items.map((item) => {
              const itemPromo = promotion?.itemDiscounts?.[item.variantId];
              const isFree = Boolean(itemPromo?.isFreeItem);
              const freeQty = itemPromo?.freeQuantity || 0;
              const allUnitsFree = isFree && freeQty >= item.quantity;

              return (
                <div key={item.id} className="cart-item-row">
                  <div className="cart-item-info">
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--ff-charcoal)' }}>
                      {item.variant.product.name}
                    </p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--ff-charcoal-soft)' }}>
                      {item.variant.sizeLabel}
                    </p>
                    {isFree && (
                      <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #a7f3d0',
                        }}>
                          1+1 FREE
                        </span>
                        {freeQty < item.quantity && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)' }}>
                            ({freeQty} Free · {item.quantity - freeQty} Paid)
                          </span>
                        )}
                      </div>
                    )}
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

                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      {allUnitsFree ? (
                        <>
                          <span style={{ textDecoration: 'line-through', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)', display: 'block' }}>
                            ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.95rem' }}>
                            FREE (₹0)
                          </span>
                        </>
                      ) : isFree ? (
                        <>
                          <span style={{ color: 'var(--ff-charcoal)', fontWeight: 600, fontSize: '0.95rem' }}>
                            ₹{(Number(item.variant.price) * (item.quantity - freeQty)).toLocaleString('en-IN')}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>
                            FREE × {freeQty}
                          </span>
                        </>
                      ) : (
                        <span className="cart-item-total">
                          ₹{(Number(item.variant.price) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

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
              );
            })}
          </div>
        </section>

        <aside className="cart-summary">
          <p className="section-kicker" style={{ marginBottom: '1.25rem' }}>Order summary</p>
          <div className="summary-row">
            <span>Product Subtotal</span>
            <strong>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>

          {discountTotal > 0 && (
            <div className="summary-row" style={{ color: '#047857' }}>
              <span style={{ fontWeight: 600 }}>1+1 Offer Discount</span>
              <strong style={{ color: '#047857' }}>-₹{discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          )}

          <div className="summary-row">
            <span>Taxable Value</span>
            <strong>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>

          <div className="summary-row">
            <span>Included GST (18%)</span>
            <strong>₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>

          <div className="summary-row muted">
            <span>Shipping</span>
            <strong style={{ color: 'var(--ff-success)' }}>FREE</strong>
          </div>

          <div className="summary-row" style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid rgba(32, 28, 27, 0.1)' }}>
            <span style={{ fontWeight: 700 }}>Final Payable Amount</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--ff-burgundy)' }}>
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <p className="summary-note" style={{ marginTop: '1rem' }}>
            Final tax split (CGST + SGST or IGST) is calculated dynamically from your delivery address.
          </p>

          <div style={{ marginTop: '1.75rem' }}>
            <Button href="/checkout" className="btn-block">Proceed to checkout</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
