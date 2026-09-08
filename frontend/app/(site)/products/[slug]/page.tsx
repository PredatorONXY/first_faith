import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '../../../../services/products';
import { AddToCartButton } from '../../../../components/product/AddToCartButton';
import { ProductImageGallery } from '../../../../components/product/ProductImageGallery';
import { getProductContent } from '../../../../lib/productContent';
import { getProductGalleryImages } from '../../../../lib/productImages';

interface Props { params: { slug: string } }

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
  const heroIngredients = content.heroIngredients.length > 0 ? content.heroIngredients : product.ingredients.filter((item) => item.role === 'HERO').map((item) => item.ingredient.name);
  const powerIngredients = content.powerIngredients.length > 0 ? content.powerIngredients : product.ingredients.filter((item) => item.role === 'POWER').map((item) => item.ingredient.name);

  return <main className="site-shell px-6 py-12 md:px-10 md:py-20">
    <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
      <ProductImageGallery images={galleryImages} productName={content.name} />
      <div className="flex flex-col justify-center">
        <p className="eyebrow">The essential ritual</p>
        <h1 className="mt-4 font-display text-6xl leading-[0.9] text-charcoal md:text-8xl">{content.name}</h1>
        {content.tagline && <p className="mt-6 text-lg leading-8 text-charcoal-soft">{content.tagline}</p>}
        <div className="mt-8 flex items-baseline gap-4 border-y border-stone py-5">
          <span className="font-display text-3xl text-burgundy">{variant ? `₹${Number(variant.price).toLocaleString('en-IN')}` : 'Price coming soon'}</span>
          {variant && <span className="text-sm text-charcoal-soft">{content.sizeLabel ?? variant.sizeLabel}</span>}
        </div>
        {content.shortDescription && <p className="mt-7 leading-8 text-charcoal-soft">{content.shortDescription}</p>}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {variant && <AddToCartButton variantId={variant.id} disabled={!available} />}
          <span className={`text-xs uppercase tracking-[0.15em] ${available ? 'text-burgundy' : 'text-charcoal-soft'}`}>{available ? 'In stock' : 'Currently unavailable'}</span>
        </div>
        <div className="mt-12 space-y-7">
          {heroIngredients.length > 0 && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">Hero ingredients</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{heroIngredients.map((item) => <li key={item} className="text-sm text-charcoal-soft"><span className="font-medium text-charcoal">{item}</span></li>)}</ul></div>}
          {powerIngredients.length > 0 && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">Power ingredients</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{powerIngredients.map((item) => <li key={item} className="text-sm text-charcoal-soft"><span className="font-medium text-charcoal">{item}</span></li>)}</ul></div>}
          {content.benefits.length > 0 && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">Benefits</h2><div className="mt-4 flex flex-wrap gap-2">{content.benefits.map((benefit) => <span key={benefit} className="rounded-full border border-stone bg-blush-soft px-3 py-1 text-xs uppercase tracking-[0.12em] text-charcoal-soft">{benefit}</span>)}</div></div>}
        </div>
      </div>
    </div>
    {content.fullDescription && <section className="mt-20 border-t border-stone pt-10 md:mt-28 md:grid md:grid-cols-[0.5fr_1fr] md:gap-10"><p className="eyebrow">The formula</p><p className="max-w-2xl text-lg leading-8 text-charcoal-soft">{content.fullDescription}</p></section>}
  </main>;
}
