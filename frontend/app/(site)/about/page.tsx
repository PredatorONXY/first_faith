import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'First Faith — Perfect Blend of Nature & Science.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:px-10">
      <h1 className="font-display text-3xl text-charcoal md:text-4xl">
        Perfect blend of nature &amp; science
      </h1>
      <p className="mt-6 leading-relaxed text-charcoal-soft">
        At First Faith, we believe effective skincare is not about choosing between nature and
        science — it is about bringing them together thoughtfully.
      </p>
      <p className="mt-4 leading-relaxed text-charcoal-soft">
        From Rice Water, Oat, Green Tea and Centella to Niacinamide, Hyaluronic Acid, Ceramides,
        Alpha Arbutin and Snail Mucin, our formulations combine botanical ingredients with
        purposeful cosmetic actives to create a modern skincare experience.
      </p>

      <div className="mt-12 grid gap-8 border-t border-stone pt-10 md:grid-cols-3">
        <div>
          <h2 className="font-display text-lg text-charcoal">Botanicals</h2>
          <p className="mt-2 text-sm text-charcoal-soft">
            Inspired by nature and selected for their skin-conditioning properties.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-charcoal">Actives</h2>
          <p className="mt-2 text-sm text-charcoal-soft">
            Purposeful cosmetic ingredients chosen for specific skincare roles.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-charcoal">Formulation</h2>
          <p className="mt-2 text-sm text-charcoal-soft">
            Balanced combinations designed for a sensorial and functional skincare experience.
          </p>
        </div>
      </div>
    </div>
  );
}
