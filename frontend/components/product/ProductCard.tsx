import Image from 'next/image';
import Link from 'next/link';
import { Product } from '../../types/product';

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-md border border-stone bg-white shadow-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[3/4] bg-blush-soft">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 768px) 25vw, 50vw"
          />
        ) : null}
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg text-charcoal">{product.name}</h3>
        {product.tagline && (
          <p className="mt-1 text-sm text-charcoal-soft">{product.tagline}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-charcoal-soft">{variant?.sizeLabel}</span>
          {variant ? (
            <span className="font-medium text-burgundy">₹{Number(variant.price).toLocaleString('en-IN')}</span>
          ) : (
            <span className="text-sm text-charcoal-soft">Price coming soon</span>
          )}
        </div>
      </div>
    </Link>
  );
}
