import type { Metadata } from 'next';
import Image from 'next/image';
import storyImage from '../../../img/IMG-20260831-WA0009.jpg';
import ritualImage from '../../../img/IMG-20260831-WA0013.jpg';
import { Button } from '../../../components/ui/Button';

export const metadata: Metadata = {
  title: 'About',
  description: 'First Faith — Perfect Blend of Nature & Science.',
};

const PILLARS = [
  {
    number: '01',
    title: 'Botanicals',
    body: 'Inspired by nature and selected for skin-conditioning properties that soothe, balance, and restore.',
  },
  {
    number: '02',
    title: 'Actives',
    body: 'Purposeful cosmetic ingredients chosen for specific skincare roles and clinically documented efficacy.',
  },
  {
    number: '03',
    title: 'Formulation',
    body: 'Balanced combinations designed for a sensorial, weightless finish that makes every application a pleasure.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-intro">
        <div className="site-shell">
          <p className="eyebrow">The First Faith philosophy</p>
          <h1 className="display-title">
            Care is a ritual,<br />
            not a rush.
          </h1>
          <p style={{ marginTop: '1.25rem', maxWidth: '36rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.75 }}>
            We believe effective skincare is not about choosing between nature and science. It is about bringing them together thoughtfully.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="site-shell ritual-layout">
          <div className="ritual-media-wrap">
            <Image
              src={storyImage}
              alt="First Faith skincare philosophy"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>

          <div className="ritual-copy">
            <p className="eyebrow">A modern point of view</p>
            <h2 className="ritual-title">Botanicals give a formula its soul. Actives give it purpose.</h2>
            <p className="ritual-text">
              From Rice Water, Oat, Green Tea, and Centella to Niacinamide, Hyaluronic Acid, Ceramides,
              Alpha Arbutin, and Snail Mucin, our ingredients are selected for a reason and made to belong
              in real routines.
            </p>
            <div style={{ marginTop: '2rem' }}>
              <Button href="/ingredients" variant="outline">Explore our ingredients</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="approach-section" style={{ background: 'rgba(238, 216, 207, 0.4)', borderTop: '1px solid rgba(32, 28, 27, 0.08)', borderBottom: '1px solid rgba(32, 28, 27, 0.08)' }}>
        <div className="site-shell">
          <div className="section-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <p className="section-kicker">Our foundation</p>
              <h2 className="section-title">The three pillars</h2>
            </div>
          </div>
          <div className="approach-grid">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="approach-card">
                <span className="approach-number">{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="site-shell ritual-layout">
          <div className="ritual-copy">
            <p className="eyebrow">Beyond just skincare</p>
            <h2 className="ritual-title">Small moments. Real care.</h2>
            <p className="ritual-text">
              Every morning and evening, the minutes you spend caring for your skin are an opportunity to
              pause, reset, and nurture your wellbeing. We make sure those moments feel beautiful.
            </p>
            <div style={{ marginTop: '2.2rem' }}>
              <Button href="/shop">Explore the collection</Button>
            </div>
          </div>

          <div className="ritual-media-wrap">
            <Image
              src={ritualImage}
              alt="First Faith skincare ritual"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </div>
      </section>
    </>
  );
}
