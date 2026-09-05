import type { Metadata } from 'next';
import { getPublishedProducts } from '../../../services/products';
import { ProductCard } from '../../../components/product/ProductCard';

export const metadata: Metadata = { title: 'Shop', description: 'Browse the full First Faith skincare collection.' };

export default async function ShopPage() {
  const products = await getPublishedProducts().catch(() => []);
  return <>
    <section className="page-intro"><div className="site-shell flex flex-wrap items-end justify-between gap-8 px-6 md:px-10"><div><p className="eyebrow">The collection</p><h1 className="display-title">Your ritual,<br />beautifully considered.</h1></div><p className="max-w-xs pb-2 text-sm leading-7 text-charcoal-soft">Botanical ingredients and purposeful actives for every skin story.</p></div></section>
    <section className="site-shell px-6 py-16 md:px-10 md:py-24"><div className="flex items-center justify-between border-b border-stone pb-5"><p className="text-sm text-charcoal-soft">{products.length} essentials</p><p className="text-[0.65rem] uppercase tracking-[0.16em] text-burgundy">Nature / Science / Ritual</p></div>{products.length > 0 ? <div className="mt-10 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-10 text-charcoal-soft">The collection is being prepared.</p>}</section>
  </>;
}
