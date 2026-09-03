import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductBySlug } from '../../../../services/products';
import { Button } from '../../../../components/ui/Button';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: 'Product not found' };

  return {
    title: product.name,
    description: product.shortDescription ?? product.tagline ?? undefined,
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();

  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const heroIngredients = product.ingredients.filter((i) => i.role === 'HERO');
  const powerIngredients = product.ingredients.filter((i) => i.role === 'POWER');

  // Structured data for SEO — only includes fields we actually have.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? undefined,
    image: product.images[0]?.url,
    offers: variant
      ? {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: variant.price,
          availability:
            (variant.inventory?.stockQuantity ?? 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        }
      : undefined,
  };

  return (
    <div className="mx-auto max-w-site px-6 py-16 md:px-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="product-page-shell">
        <div className="product-gallery-card premium-card">
          <div className="product-gallery-wrap">
            {product.images[0] && (
              <Image
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.name}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 45vw, 100vw"
              />
            )}
          </div>
        </div>

        <div className="product-info-card">
          <p className="section-kicker product-section-kicker">First Faith</p>
          <h1 className="font-display text-3xl text-charcoal md:text-4xl">{product.name}</h1>
          {product.tagline && <p className="mt-2 text-charcoal-soft">{product.tagline}</p>}

          <div className="product-price-row">
            {variant ? (
              <span className="text-2xl font-medium text-burgundy">
                ₹{Number(variant.price).toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-charcoal-soft">Price to be added</span>
            )}
            {variant && <span className="text-sm text-charcoal-soft">{variant.sizeLabel}</span>}
          </div>

          {product.shortDescription && (
            <p className="product-description">{product.shortDescription}</p>
          )}

          <div className="product-actions">
            <Button>Add to cart</Button>
            <Button variant="outline">Buy now</Button>
          </div>

          {heroIngredients.length > 0 && (
            <div className="product-meta-block">
              <h2 className="product-meta-title">Hero ingredients</h2>
              <ul className="ingredient-list">
                {heroIngredients.map((i) => (
                  <li key={i.ingredient.id}>
                    <span>{i.ingredient.name}</span>
                    {i.ingredient.description ? ` — ${i.ingredient.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {powerIngredients.length > 0 && (
            <div className="product-meta-block">
              <h2 className="product-meta-title">Power ingredients</h2>
              <ul className="ingredient-list">
                {powerIngredients.map((i) => (
                  <li key={i.ingredient.id}>
                    <span>{i.ingredient.name}</span>
                    {i.ingredient.description ? ` — ${i.ingredient.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.howToUse && (
            <div className="product-meta-block">
              <h2 className="product-meta-title">How to use</h2>
              <p className="product-meta-copy">{product.howToUse}</p>
            </div>
          )}

          {product.suitableSkinTypes && (
            <div className="product-meta-block">
              <h2 className="product-meta-title">Suitable for</h2>
              <p className="product-meta-copy">{product.suitableSkinTypes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
