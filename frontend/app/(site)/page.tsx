import Image from 'next/image';
import { getPublishedProducts } from '../../services/products';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import heroImage from '../../img/IMG-20260831-WA0012.jpg';
import ritualImage from '../../img/IMG-20260831-WA0008.jpg';
import bodyButterImage from '../../img/IMG-20260831-WA0018.jpg';
import serumImage from '../../img/IMG-20260831-WA0014.jpg';
import cleanserImage from '../../img/IMG-20260831-WA0010.jpg';
import sunscreenImage from '../../img/IMG-20260831-WA0011.jpg';

const APPROACH = [
  {
    title: 'Botanicals',
    body: 'Ingredients selected for their skin-conditioning properties.',
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

const SHOWCASE_PRODUCTS = [
  {
    name: 'Body Butter',
    tagline: 'Nourishing plant-based moisture for daily rituals.',
    image: bodyButterImage,
  },
  {
    name: 'Serum',
    tagline: 'Brightening, replenishing hydration for a healthy-looking glow.',
    image: serumImage,
  },
  {
    name: 'Cleanser',
    tagline: 'Gentle daily cleansing with rice water and vitamin B5.',
    image: cleanserImage,
  },
  {
    name: 'Sunscreen',
    tagline: 'Daily UV protection with a featherlight, non-greasy finish.',
    image: sunscreenImage,
  },
];

export default async function HomePage() {
  const products = await getPublishedProducts().catch(() => []);
  const featuredProducts = products.slice(0, 4);

  return (
    <>
      <section className="hero-section">
        <div className="site-shell hero-grid">
          <div className="hero-copy">
            <span className="brand-pill">Beyond Just Skincare</span>
            <h1 className="hero-title">Perfect blend of nature &amp; science</h1>
            <p className="hero-text">
              Thoughtfully selected botanical ingredients. Purposeful cosmetic actives.
              Modern formulations, built without compromise.
            </p>
            <div className="hero-actions">
              <Button href="/shop">Shop the collection</Button>
              <Button href="/ingredients" variant="outline">Explore ingredients</Button>
            </div>
          </div>

          <div className="premium-card hero-panel">
            <div className="hero-media-wrap">
              <Image
                src={heroImage}
                alt="First Faith skincare product display"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="hero-overlay">
                <span className="hero-overlay-badge">Botanicals</span>
                <span className="hero-overlay-label">Mindfully made</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell section-block">
        <div className="section-header">
          <div>
            <p className="section-kicker">Shop the essentials</p>
            <h2 className="section-title">Our collection</h2>
          </div>
          <Button variant="ghost" href="/shop">View all</Button>
        </div>

        <div className="product-grid">
          {SHOWCASE_PRODUCTS.map((product) => (
            <div key={product.name} className="product-shell">
              <div className="product-image-wrap">
                <Image
                  src={product.image}
                  alt={`${product.name} product`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              </div>
              <div className="product-copy">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-tagline">{product.tagline}</p>
              </div>
            </div>
          ))}

          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="product-shell product-copy fallback-card">
              Products will appear here once added in the admin dashboard.
            </div>
          )}
        </div>
      </section>

      <section className="story-band">
        <div className="site-shell story-layout">
          <p className="section-kicker">Beyond Just Skincare.</p>
          <h2 className="section-title">Thoughtful formulas for everyday rituals.</h2>
          <p>
            Rooted in nature and shaped by science, First Faith brings together mindful ingredients,
            elegant textures, and practical routines for skin that feels balanced, cared for, and at ease.
          </p>
        </div>
      </section>

      <section className="site-shell section-block">
        <div className="ritual-layout">
          <div className="ritual-copy">
            <p className="section-kicker">The First Faith ritual</p>
            <h2 className="section-title">A softer way to care for your skin.</h2>
            <p>
              Created to feel as good as it looks, each step is designed around comfort,
              balance, and visible glow—without unnecessary additives or harsh extremes.
            </p>
            <ul className="ritual-points">
              <li>Clinically informed formulations</li>
              <li>Daily-use textures that layer beautifully</li>
              <li>Results-first ingredients with a sensorial finish</li>
            </ul>
          </div>

          <div className="ritual-media-wrap premium-card">
            <Image
              src={ritualImage}
              alt="First Faith skincare routine"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 40vw, 90vw"
            />
          </div>
        </div>
      </section>

      <section className="site-shell section-block">
        <div className="section-header compact-header">
          <h2 className="section-title">Our approach</h2>
        </div>
        <div className="feature-grid">
          {APPROACH.map((item) => (
            <article key={item.title} className="feature-card">
              <span className="feature-badge">0{APPROACH.indexOf(item) + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell section-block">
        <div className="newsletter-box">
          <h2 className="section-title newsletter-title">Stay close to First Faith</h2>
          <p className="newsletter-copy">Be the first to know about new formulations and restocks.</p>
          <form className="newsletter-form">
            <input type="email" required placeholder="Your email" aria-label="Your email" />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>
    </>
  );
}
