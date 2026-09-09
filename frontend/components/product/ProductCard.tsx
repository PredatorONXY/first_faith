import Image from 'next/image';
import Link from 'next/link';
import { getPrimaryProductImage } from '../../lib/productImages';
import { getProductContent } from '../../lib/productContent';
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
  const displayName = content?.name ?? product.name;
  const displayTagline = content?.tagline ?? product.tagline;
  const displaySize = content?.sizeLabel ?? variant?.sizeLabel;

  return (
    <article className="product-card group block overflow-hidden border border-stone bg-white/60 transition-all duration-500 hover:-translate-y-1 hover:border-burgundy/40 hover:shadow-[0_16px_36px_rgba(32,28,27,0.08)]">
      <Link href={`/products/${product.slug}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-blush-soft">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.045]"
            sizes="(min-width: 768px) 25vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blush-soft text-xs uppercase tracking-[0.18em] text-charcoal-soft">
            First Faith
          </div>
        )}
      </div>
      </Link>
      <div className="p-5 md:p-6">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-burgundy">Essential ritual</p>
        <h3 className="mt-2 font-display text-xl text-charcoal">{displayName}</h3>
        {displayTagline && <p className="mt-1 text-sm text-charcoal-soft">{displayTagline}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-charcoal-soft">{displaySize}</span>
          {variant ? (
            <span className="font-medium text-burgundy">₹{Number(variant.price).toLocaleString('en-IN')}</span>
          ) : (
            <span className="text-sm text-charcoal-soft">Price coming soon</span>
          )}
        </div>
        {variant && <CartProductActions variantId={variant.id} stockQuantity={variant.inventory?.stockQuantity ?? 0} />}
      </div>
    </article>
  );
}
