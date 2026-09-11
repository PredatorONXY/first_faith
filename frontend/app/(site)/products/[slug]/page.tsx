import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '../../../../services/products';
import { AddToCartButton } from '../../../../components/product/AddToCartButton';
import { ProductImageGallery } from '../../../../components/product/ProductImageGallery';
import { getProductContent } from '../../../../lib/productContent';
import { getProductGalleryImages } from '../../../../lib/productImages';

interface Props {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  const content = product ? getProductContent(product.slug) : null;
  const description = content?.shortDescription ?? product?.shortDescription ?? product?.tagline ?? undefined;
  return product ? { title: content?.name ?? product.name, description } : { title: 'Product not found' };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();

  const content = getProductContent(product.slug) ?? {
    name: product.name,
    tagline: product.tagline ?? '',
    shortDescription: product.shortDescription ?? '',
    fullDescription: product.fullDescription ?? '',
    sizeLabel: product.variants[0]?.sizeLabel ?? 'Size available',
    heroIngredients: product.ingredients.filter((item) => item.role === 'HERO').map((item) => item.ingredient.name),
    powerIngredients: product.ingredients.filter((item) => item.role === 'POWER').map((item) => item.ingredient.name),
    benefits: [],
  };

  const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
  const available = (variant?.inventory?.stockQuantity ?? 0) > 0;
  const galleryImages = getProductGalleryImages(product.slug).map((image) => ({
    src: image.src,
    alt: image.alt,
  }));
  const heroIngredients = content.heroIngredients.length > 0
    ? content.heroIngredients
    : product.ingredients.filter((item) => item.role === 'HERO').map((item) => item.ingredient.name);
  const powerIngredients = content.powerIngredients.length > 0
    ? content.powerIngredients
    : product.ingredients.filter((item) => item.role === 'POWER').map((item) => item.ingredient.name);
  const price = variant ? Number(variant.price).toLocaleString('en-IN') : null;

  return (
    <main className="site-shell" style={{ padding: '3.5rem 0 5rem' }}>
      <div className="product-detail-layout">
        <ProductImageGallery images={galleryImages} productName={content.name} />

        <div className="product-info-panel">
          <p className="eyebrow">The essential ritual</p>
          <h1 className="product-detail-title">{content.name}</h1>
          {content.tagline && <p className="product-detail-tagline">{content.tagline}</p>}

          <div className="product-price-bar">
            <span className="product-price-main">
              {price ? `₹${price}` : 'Price coming soon'}
            </span>
            {variant && (
              <span className="product-size-pill">{content.sizeLabel ?? variant.sizeLabel}</span>
            )}
          </div>

          {content.shortDescription && (
            <p style={{ marginTop: '1.25rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.75, fontSize: '1rem' }}>
              {content.shortDescription}
            </p>
          )}

          <div className="product-detail-actions">
            {variant && <AddToCartButton variantId={variant.id} disabled={!available} />}
            <span
              className="product-stock-status"
              style={{ color: available ? 'var(--ff-burgundy)' : 'var(--ff-charcoal-soft)' }}
            >
              {available ? 'In stock · Ready to dispatch' : 'Currently unavailable'}
            </span>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {heroIngredients.length > 0 && (
              <div className="ingredient-meta-section">
                <h2 className="ingredient-meta-title">Hero ingredients</h2>
                <div className="ingredient-chip-list">
                  {heroIngredients.map((item) => (
                    <span key={item} className="ingredient-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {powerIngredients.length > 0 && (
              <div className="ingredient-meta-section">
                <h2 className="ingredient-meta-title">Power ingredients</h2>
                <div className="ingredient-chip-list">
                  {powerIngredients.map((item) => (
                    <span key={item} className="ingredient-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {content.benefits.length > 0 && (
              <div className="ingredient-meta-section">
                <h2 className="ingredient-meta-title">Key benefits</h2>
                <div className="benefit-badge-list">
                  {content.benefits.map((benefit) => (
                    <span key={benefit} className="benefit-badge">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {content.fullDescription && (
        <section className="product-formula-block">
          <p className="eyebrow">The formulation</p>
          <h2 className="section-title" style={{ fontSize: '2.2rem', marginTop: '0.4rem' }}>
            Pure intention behind every drop
          </h2>
          <p style={{ marginTop: '1.25rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.85, maxWidth: '48rem' }}>
            {content.fullDescription}
          </p>
        </section>
      )}
    </main>
  );
}
