import Image from 'next/image';
import Link from 'next/link';
import { getPrimaryProductImage } from '../../lib/productImages';
import { getProductContent } from '../../lib/productContent';
import { getProductPromotionOffer } from '../../lib/promotions';
import { Product } from '../../types/product';
import { CartProductActions } from './CartProductActions';

export function ProductCard({ product }: { product: Product }) {
  const mappedImage = getPrimaryProductImage(product.slug);
  const image = mappedImage ?? (product.images?.[0] ? {
    src: product.images[0].url,
    alt: product.images[0].altText ?? product.name,
  } : null);
  const variant = product.variants?.find((v) => v.isDefault) ?? product.variants?.[0];
  const content = getProductContent(product.slug) ?? null;
  const displayName = product.name || content?.name;
  const displayTagline = product.tagline || content?.tagline || product.shortDescription || content?.shortDescription;
  const displaySize = variant?.sizeLabel || content?.sizeLabel;
  const price = variant ? Number(variant.price).toLocaleString('en-IN') : null;
  const promoOffer = getProductPromotionOffer(product.slug);

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-media-link" aria-label={`View ${displayName}`}>
        <div className="product-card-image-wrap">
          {promoOffer ? (
            <span className="product-card-badge product-card-badge-offer">1+1 OFFER</span>
          ) : (
            <span className="product-card-badge">Essential</span>
          )}
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              quality={80}
              className="product-card-image"
              sizes="(min-width: 1200px) 280px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            />
          ) : (
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ff-charcoal-soft)' }}>
              First Faith
            </div>
          )}
        </div>
      </Link>

      <div className="product-card-body">
        <div className="product-card-info">
          <p className="product-card-eyebrow">Daily ritual</p>
          <h3 className="product-card-title">
            <Link href={`/products/${product.slug}`}>{displayName}</Link>
          </h3>
          {displayTagline && (
            <p className="product-card-tagline">{displayTagline}</p>
          )}
          {promoOffer && (
            <div className="product-card-promo-strip">
              <span className="product-card-promo-label">1+1 OFFER</span>
              <p className="product-card-promo-pairing">
                <span>BUY: {promoOffer.buyName}</span>
                <span className="product-card-promo-sep">·</span>
                <span className="product-card-promo-free">GET {promoOffer.freeName} FREE</span>
              </p>
            </div>
          )}
        </div>

        <div className="product-card-bottom">
          <div className="product-card-meta">
            <span className="product-card-size">{displaySize}</span>
            {price ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="product-card-price">₹{price}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--ff-charcoal-muted)', letterSpacing: '0.02em', marginTop: '2px' }}>
                  (Incl. GST)
                </span>
              </div>
            ) : (
              <span className="product-card-size">Coming soon</span>
            )}
          </div>

          {variant && (
            <div className="product-card-actions">
              <CartProductActions variantId={variant.id} stockQuantity={variant.inventory?.stockQuantity ?? 0} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
