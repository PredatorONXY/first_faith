import type { Metadata } from 'next';
import { getPublishedProducts } from '../../../services/products';
import { ProductCard } from '../../../components/product/ProductCard';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse the full First Faith skincare collection.',
};

export default async function ShopPage() {
  const products = await getPublishedProducts().catch(() => []);

  return (
    <div className="mx-auto max-w-site px-6 py-16 md:px-10">
      <h1 className="font-display text-3xl text-charcoal md:text-4xl">Shop</h1>
      <p className="mt-2 text-charcoal-soft">Nature-inspired botanicals, science-backed actives.</p>

      {products.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-charcoal-soft">
          No products published yet. Add products from the admin dashboard to see them here.
        </p>
      )}
    </div>
  );
}
