import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductBySlug } from '../../../../services/products';
import { AddToCartButton } from '../../../../components/product/AddToCartButton';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  return product ? { title: product.name, description: product.shortDescription ?? product.tagline ?? undefined } : { title: 'Product not found' };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();
  const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
  const available = (variant?.inventory?.stockQuantity ?? 0) > 0;
  const allIngredients = product.ingredients;
  return <main className="site-shell px-6 py-12 md:px-10 md:py-20">
    <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
      <div className="relative aspect-[4/5] overflow-hidden bg-blush"><div className="absolute left-5 top-5 z-10 border border-white/60 bg-white/75 px-3 py-2 text-[0.6rem] uppercase tracking-[0.16em] text-burgundy backdrop-blur-sm">First Faith</div>{product.images[0] ? <Image src={product.images[0].url} alt={product.images[0].altText ?? product.name} fill priority className="object-cover" sizes="(min-width: 768px) 55vw, 100vw" /> : <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.16em] text-charcoal-soft">Product image coming soon</div>}</div>
      <div className="flex flex-col justify-center"><p className="eyebrow">The essential ritual</p><h1 className="mt-4 font-display text-6xl leading-[0.9] text-charcoal md:text-8xl">{product.name}</h1>{product.tagline && <p className="mt-6 text-lg leading-8 text-charcoal-soft">{product.tagline}</p>}<div className="mt-8 flex items-baseline gap-4 border-y border-stone py-5"><span className="font-display text-3xl text-burgundy">{variant ? `₹${Number(variant.price).toLocaleString('en-IN')}` : 'Price coming soon'}</span>{variant && <span className="text-sm text-charcoal-soft">{variant.sizeLabel}</span>}</div>{product.shortDescription && <p className="mt-7 leading-8 text-charcoal-soft">{product.shortDescription}</p>}<div className="mt-8 flex flex-wrap items-center gap-4">{variant && <AddToCartButton variantId={variant.id} disabled={!available} />}<span className={`text-xs uppercase tracking-[0.15em] ${available ? 'text-burgundy' : 'text-charcoal-soft'}`}>{available ? 'In stock' : 'Currently unavailable'}</span></div><div className="mt-12 space-y-7">{allIngredients.length > 0 && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">Key ingredients</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{allIngredients.map((item) => <li key={item.ingredient.id} className="text-sm text-charcoal-soft"><span className="font-medium text-charcoal">{item.ingredient.name}</span>{item.ingredient.description ? ` — ${item.ingredient.description}` : ''}</li>)}</ul></div>}{product.howToUse && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">How to use</h2><p className="mt-3 text-sm leading-7 text-charcoal-soft">{product.howToUse}</p></div>}{product.suitableSkinTypes && <div className="border-t border-stone pt-5"><h2 className="font-display text-2xl text-charcoal">Suitable for</h2><p className="mt-3 text-sm leading-7 text-charcoal-soft">{product.suitableSkinTypes}</p></div>}</div></div>
    </div>
    {product.fullDescription && <section className="mt-20 border-t border-stone pt-10 md:mt-28 md:grid md:grid-cols-[0.5fr_1fr] md:gap-10"><p className="eyebrow">The formula</p><p className="max-w-2xl text-lg leading-8 text-charcoal-soft">{product.fullDescription}</p></section>}
  </main>;
}
