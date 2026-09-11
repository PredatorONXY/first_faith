import type { Metadata } from 'next';
import { getPublishedProducts } from '../../../services/products';
import { ProductCard } from '../../../components/product/ProductCard';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse the full First Faith skincare collection — botanical ingredients and purposeful cosmetic actives.',
};

export default async function ShopPage() {
  const products = await getPublishedProducts().catch(() => []);

  return (
    <>
      <section className="page-intro">
        <div className="site-shell">
          <p className="eyebrow">The collection</p>
          <h1 className="display-title">
            Your ritual,<br />
            beautifully considered.
          </h1>
          <p style={{ marginTop: '1.25rem', maxWidth: '34rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.75 }}>
            Botanical ingredients and purposeful cosmetic actives formulated for every skin story.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="site-shell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(32, 28, 27, 0.1)', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--ff-charcoal-soft)', margin: 0 }}>
              Showing {products.length} essentials
            </p>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ff-burgundy)', fontWeight: 600 }}>
              Nature · Science · Ritual
            </span>
          </div>

          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--ff-charcoal-soft)' }}>
              The collection is currently being prepared.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
