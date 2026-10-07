import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getPublishedProducts } from '../../../services/products';
import { ProductCard } from '../../../components/product/ProductCard';

import clayMaskOfferImg from '../../../img/offer_img/Clay Mask and Cleanser 1+1 Offer.png';
import bodyButterOfferImg from '../../../img/offer_img/1+1 Body Butter and Serum Offer.png';
import sunscreenOfferImg from '../../../img/offer_img/1+1 Skincare Duo_ Sunscreen & Cleanser.png';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse the full First Faith skincare collection — botanical ingredients and purposeful cosmetic actives.',
};

export const dynamic = 'force-dynamic';

const VISUAL_OFFERS = [
  {
    id: 'clay-mask-cleanser',
    slug: 'clay-mask',
    title: 'CLAY MASK + CLEANSER',
    buyText: 'BUY CLAY MASK',
    getText: 'GET CLEANSER FREE',
    ctaText: 'SHOP CLAY MASK →',
    image: clayMaskOfferImg,
    badge: '1+1 OFFER',
    note: 'Free Cleanser (₹525 value) automatically added to bag',
  },
  {
    id: 'body-butter-serum',
    slug: 'body-butter',
    title: 'BODY BUTTER + SERUM',
    buyText: 'BUY BODY BUTTER',
    getText: 'GET SERUM FREE',
    ctaText: 'SHOP BODY BUTTER →',
    image: bodyButterOfferImg,
    badge: '1+1 OFFER',
    note: 'Free Serum (₹675 value) automatically added to bag',
  },
  {
    id: 'sunscreen-cleanser',
    slug: 'sunscreen',
    title: 'SUNSCREEN + CLEANSER',
    buyText: 'BUY SUNSCREEN',
    getText: 'GET CLEANSER FREE',
    ctaText: 'SHOP SUNSCREEN →',
    image: sunscreenOfferImg,
    badge: '1+1 OFFER',
    note: 'Free Cleanser (₹525 value) automatically added to bag',
  },
];

export default async function ShopPage() {
  const products = await getPublishedProducts().catch(() => []);

  return (
    <>
      {/* 1. SHOP PAGE INTRO */}
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

      {/* 2. 1+1 SKINCARE OFFERS VISUAL SECTION */}
      <section className="shop-offers-section" id="skincare-offers">
        <div className="site-shell">
          <div className="shop-offers-header">
            <span className="brand-pill shop-offers-pill">Special Skincare Offer</span>
            <h2 className="shop-offers-title">1+1 SKINCARE OFFERS</h2>
            <p className="shop-offers-subtitle">
              Enhance your daily ritual with complimentary pairings. Purchase any qualifying product below to receive its full-size companion free in your bag. All products may also be purchased individually.
            </p>
          </div>

          <div className="shop-offers-grid">
            {VISUAL_OFFERS.map((offer) => (
              <article key={offer.id} className="shop-offer-card">
                <Link
                  href={`/products/${offer.slug}`}
                  className="shop-offer-card-media-link"
                  aria-label={`View ${offer.title} offer`}
                >
                  <div className="shop-offer-card-media">
                    <span className="shop-offer-badge">{offer.badge}</span>
                    <Image
                      src={offer.image}
                      alt={offer.title}
                      priority
                      quality={90}
                      className="shop-offer-card-img"
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                </Link>

                <div className="shop-offer-card-body">
                  <h3 className="shop-offer-card-title">
                    <Link href={`/products/${offer.slug}`}>{offer.title}</Link>
                  </h3>

                  <div className="shop-offer-card-text">
                    <span className="shop-offer-buy">{offer.buyText}</span>
                    <span className="shop-offer-plus">+</span>
                    <span className="shop-offer-get">{offer.getText}</span>
                  </div>

                  <p className="shop-offer-card-note">{offer.note}</p>

                  <div className="shop-offer-card-action">
                    <Link href={`/products/${offer.slug}`} className="shop-offer-cta-btn">
                      {offer.ctaText}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ALL PRODUCTS CATALOG */}
      <section className="section-block" style={{ paddingTop: '1.5rem' }}>
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
