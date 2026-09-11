import Image from 'next/image';
import { getPublishedProducts } from '../../services/products';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import heroImage from '../../img/IMG-20260831-WA0012.jpg';
import ritualImage from '../../img/IMG-20260831-WA0008.jpg';

const APPROACH = [
  {
    number: '01',
    title: 'Botanicals',
    body: 'Plant-led ingredients inspired by nature and selected for comfort, balance, and skin-conditioning benefits.',
  },
  {
    number: '02',
    title: 'Actives',
    body: 'Purposeful cosmetic actives chosen with scientific precision for what your skin barrier actually needs.',
  },
  {
    number: '03',
    title: 'Formulation',
    body: 'Balanced textures and considered combinations that make consistency and everyday care feel effortless.',
  },
];

export default async function HomePage() {
  const products = await getPublishedProducts().catch(() => []);
  const featuredProducts = products.slice(0, 4);

  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="site-shell hero-grid">
          <div className="hero-copy">
            <span className="brand-pill">Beyond Just Skincare</span>
            <h1 className="hero-title">Perfect blend of nature &amp; science</h1>
            <p className="hero-text">
              Thoughtfully selected botanical ingredients. Purposeful cosmetic actives.
              Modern formulations, built without compromise for balanced, radiant skin.
            </p>
            <div className="hero-actions">
              <Button href="/shop">Shop the collection</Button>
              <Button href="/ingredients" variant="outline">Explore ingredients</Button>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-media-wrap">
              <Image
                src={heroImage}
                alt="First Faith skincare product display"
                fill
                priority
                style={{ objectFit: 'cover' }}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="hero-overlay">
                <div>
                  <span className="hero-overlay-badge">First Faith / 01</span>
                  <p className="hero-overlay-label">Mindfully made</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE ESSENTIALS / COLLECTION */}
      <section className="section-block">
        <div className="site-shell">
          <div className="section-header">
            <div>
              <p className="section-kicker">Shop the essentials</p>
              <h2 className="section-title">Our collection</h2>
            </div>
            <Button href="/shop" variant="ghost">View all products →</Button>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--ff-charcoal-soft)' }}>
              The collection is currently being prepared.
            </div>
          )}
        </div>
      </section>

      {/* 3. STORY BAND / PHILOSOPHY */}
      <section className="story-band">
        <div className="site-shell story-layout">
          <p className="section-kicker">Beyond Just Skincare.</p>
          <h2 className="story-title">Thoughtful formulas for everyday rituals.</h2>
          <p className="story-text">
            Rooted in nature and shaped by science, First Faith brings together mindful ingredients,
            elegant textures, and practical routines for skin that feels balanced, cared for, and at ease.
          </p>
        </div>
      </section>

      {/* 4. THE RITUAL */}
      <section className="section-block">
        <div className="site-shell ritual-layout">
          <div className="ritual-copy">
            <p className="section-kicker">The First Faith ritual</p>
            <h2 className="ritual-title">A softer way to care for your skin.</h2>
            <p className="ritual-text">
              Created to feel as good as it looks, each step is designed around comfort,
              balance, and visible glow—without unnecessary additives or harsh extremes.
            </p>
            <ul className="ritual-points">
              <li>Clinically informed formulations for lasting skin resilience</li>
              <li>Daily-use textures that layer beautifully and absorb seamlessly</li>
              <li>Results-first ingredients with a comforting, sensorial finish</li>
            </ul>
            <div style={{ marginTop: '2.5rem' }}>
              <Button href="/about" variant="outline">Our philosophy</Button>
            </div>
          </div>

          <div className="ritual-media-wrap">
            <Image
              src={ritualImage}
              alt="First Faith skincare routine"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </div>
      </section>

      {/* 5. OUR APPROACH */}
      <section className="approach-section" style={{ background: 'rgba(255, 255, 255, 0.45)', borderTop: '1px solid rgba(32, 28, 27, 0.08)', borderBottom: '1px solid rgba(32, 28, 27, 0.08)' }}>
        <div className="site-shell">
          <div className="section-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <p className="section-kicker">Our approach</p>
              <h2 className="section-title">Formulated with intention</h2>
            </div>
          </div>
          <div className="approach-grid">
            {APPROACH.map((item) => (
              <article key={item.title} className="approach-card">
                <span className="approach-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. NEWSLETTER */}
      <section className="section-block">
        <div className="site-shell">
          <div className="newsletter-box">
            <p className="section-kicker">Stay close</p>
            <h2 className="newsletter-title">Stay close to First Faith</h2>
            <p className="newsletter-copy">
              Be the first to know about new formulations, mindful rituals, and limited restocks.
            </p>
            <form className="newsletter-form" action="/contact">
              <input
                type="email"
                required
                placeholder="Your email address"
                aria-label="Your email address"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
