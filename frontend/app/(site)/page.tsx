import { getPublishedProducts } from '../../services/products';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';

const APPROACH = [
  {
    title: 'Botanicals',
    body: 'Inspired by nature and selected for their skin-conditioning properties.',
  },
  {
    title: 'Actives',
    body: 'Purposeful cosmetic ingredients chosen for specific skincare roles.',
  },
  {
    title: 'Formulation',
    body: 'Balanced combinations designed for a sensorial and functional skincare experience.',
  },
];

export default async function HomePage() {
  // Falls back to an empty catalog gracefully if the backend/DB isn't
  // seeded yet — the page still renders instead of erroring out.
  const products = await getPublishedProducts().catch(() => []);

  return (
    <>
      {/* Hero — the brand's own words carry it; no invented copy. */}
      <section className="border-b border-stone bg-cream">
        <div className="mx-auto grid max-w-site items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-10 md:py-32">
          <div>
            <p className="text-sm uppercase tracking-wide text-burgundy">Beyond Just Skincare</p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-charcoal md:text-5xl">
              Perfect blend of nature &amp; science
            </h1>
            <p className="mt-6 max-w-md text-charcoal-soft">
              Thoughtfully selected botanical ingredients. Purposeful cosmetic actives.
              Modern formulations, built without compromise.
            </p>
            <div className="mt-8">
              <Button href="/shop">Shop the collection</Button>
            </div>
          </div>
          <div className="aspect-[4/5] rounded-md bg-blush-soft" aria-hidden />
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-site px-6 py-20 md:px-10">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="font-display text-3xl text-charcoal">Our collection</h2>
          <Button variant="ghost" href="/shop">View all</Button>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-charcoal-soft">Products will appear here once added in the admin dashboard.</p>
        )}
      </section>

      {/* Our approach */}
      <section className="border-y border-stone bg-blush">
        <div className="mx-auto max-w-site px-6 py-20 md:px-10">
          <h2 className="font-display text-3xl text-charcoal">Our approach</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {APPROACH.map((item) => (
              <div key={item.title} className="border-t border-charcoal pt-5">
                <h3 className="font-display text-xl text-charcoal">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="mx-auto max-w-site px-6 py-20 md:px-10">
        <div className="rounded-md border border-stone bg-blush-soft p-10 text-center md:p-16">
          <h2 className="font-display text-2xl text-charcoal md:text-3xl">
            Stay close to First Faith
          </h2>
          <p className="mx-auto mt-3 max-w-md text-charcoal-soft">
            Be the first to know about new formulations and restocks.
          </p>
          {/* Wired to a real subscribe endpoint in a later phase */}
          <form className="mx-auto mt-6 flex max-w-sm gap-2">
            <input
              type="email"
              required
              placeholder="Your email"
              className="w-full rounded-sm border border-stone bg-white px-4 py-3 text-sm"
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>
    </>
  );
}
