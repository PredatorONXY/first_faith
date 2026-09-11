import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import riceWaterImage from '../../../img/ingredients/Rice Water/3XnSGAL8lTDQvj7PmeqT7GLLWf3iiSyh1tUBR6uDomRttFtuBWh5Ml7xw0Z4PNgzLqdrgWTayQafgiv-n-UrG3hS-w4A50VlksZBr-Bfb1YhPLzlLEwIodYWO8Y2jm6ZzxH6z4FmfmvYNnB7qCAz-KJHKHs9ouGg3SaUwsZO5V2aqphUAV9NnSb04NANp-oZ.jpg';
import vitaminB5Image from '../../../img/ingredients/Vitamin B5/14Twyj5Sbu75r55pAY2i_0XMH7poaIxGRyF-dzPA9Ywyfrz-Yp3KgAlLWBJypidHVfqMY3grxbpto0c1gFR5e4k-zfXhlvwbxivfhn2a2dChU8xNHlrJLqF7g4vAJCCEAEFwoAQ6Mo3NJkYprRASjQ1Utkht4NVxcIh0gMsD8Jw24gUgJkPMmQ1SdrqzcLYF.jpg';
import snailMucinImage from '../../../img/ingredients/Snail Mucin/8DTjBzI_3qm0L9aEOEGEgaVjuu9_bOkT3dZas8v9Z-VW-iPaR4uTzcTvWzRUB4LsxZ763zVkwpNXQvcUBHEAEooBrY-__RXBbktgRNhUROSIw5R2Y_rdB0WXMC0lTi8ZBwNjOAFVhT3c6c3Oq6LhLlnuMp3oHYAqdMjljjD_STz2nIkXlvyFtRD1QsvRILZz.jpg';
import niacinamideImage from '../../../img/ingredients/Niacinamide/t5oup-dtmqSDS4ZiFFugYai2xeQNISBVoavC2iNe5VyqGGgXmtm3puf2XcjVr-J3qEmXwBDdTLfW8ScHdv2XR8TI_Mhx3uykrDb8yMLv21jBBDLHUl9i5a-1z_4o6G7CnTzfGGwnzifXo3fP8XutzkAb5cKS-ZRWboJC6lPtPAl8oAA0Re5HMb6_p_39Oben.jpg';
import hyaluronicAcidImage from '../../../img/ingredients/Hyaluronic Acid/ehu72YvT0dRTgg9NrhH1G9HMVNbsCAQWWGn0240X4Hp-O8KP9GXiwU5PlE-M1tPZoolrp3c0sDbCVJEYkDwKIttMONFlVaU7B9n9XTi9rHM-keiCdfEaRQ9mH4B90mkVgqFfTEGyNouC21GosSs01XCCXBF_NbMR40QxGfzxdMQHrVazgZyiqJPJmwj7zEGu.jpg';
import sheaButterImage from '../../../img/ingredients/Shea Butter/0KQOWfIX6kseYPPDHTDFfZBYAghwTW8Z_07k2wFg-Pauv2dv8R0XRr537jbxxIreLDwl2otZ2HmyFpxPhkrWguOwqkFX5y5pXVag8tv7aY_RztEyiqTEtrEBsBzZfJHHgc8ddLfpm7vhi_1O0gwYd5v5AE9xCOzyAz526o9YIEsOnL083RfGYGPumlhWOUwT.jpg';
import oatKernelImage from '../../../img/ingredients/Oat Kernel/ESxxr1UDzZxpK4YXueP59iOg5vxfm47uZIyDSvhRznL6b2hbMSYaLHCHs7Ai8qFQK0_p-X03WOh8PpalLiDbMAQvsnJh6OPROmNxCQI9KOMKFbgSABNoI0-kTrwVHwLlAVeZlVlLDkxMXUcffcG7GjWoN-owh2E9v9N95l2N2SA18ICMJN01ycwrerqFUbxX.jpg';
import moroccanLavaClayImage from '../../../img/ingredients/Moroccan Lava Clay/_jwhhPeFMVLn4PwdspClhJj5l52ixk6-rDHrLUvfniL8ixTdwI9KiUfu_ynQSOHLF9XLzoQO5V8HAz5wv1Q9DSASPiE1lTHtfqrPL7IOochf-u4o2JeDGoq0pTVOtk01jdx2gAblxXTitWpTbGoUG0Ilv-U1aEE4zLyAzkz4-38ZMSv3v-ErKbeEA2d-RuyD.jpg';
import alphaArbutinImage from '../../../img/ingredients/Alpha Arbutin/JwaATOtgx5PS-8x86KCmvIQqd-2K6gNu8vlUedBMEtr6NcaQDzlaY5uEt9ZEZjJzvxb0fnaa-DtahtFqj7iTWo1xn1Zzij_tPy993FZt1-tRoJ91KUrDYf6Giwr4e825MQnn3p2Uzrg9c2VwSsCe-HD1_vRJIFS_meHVVmzyEVJedMeE2h798Ys3eDl9kegd.jpg';
import centellaAsiaticaImage from '../../../img/ingredients/Centella Asiatica/7iV-9rmJ_EcD6PooEVY7qL3Zog1d-Pi_74t3IVPhqeVo8iyPmkDb5o1k5gjUvnEBIS62mci72guhKY9AfFp5G3ixNONCnLbLbcRQ6u4bzs-sFOBaQQ8ENe5DPIUuEmp3FcGdtBZPATei7szJ4o5Zil9baO2FHBP_QhKDwUSaxFP8IkIllo3LCVXoyzlyeRZQ.jpg';

export const metadata: Metadata = {
  title: 'Ingredients',
  description: 'The botanicals and actives behind every First Faith formulation.',
};

type ProductLink = {
  label: string;
  href: string;
};

type IngredientEntry = {
  name: string;
  category: 'Botanical' | 'Active' | 'Mineral';
  description: string;
  products: ProductLink[];
  image: typeof riceWaterImage;
  alt: string;
};

const INGREDIENTS: IngredientEntry[] = [
  {
    name: 'Rice Water',
    category: 'Botanical',
    description: 'A gentle ingredient featured in the First Faith Cleanser formula.',
    products: [{ label: 'Cleanser', href: '/products/cleanser' }],
    image: riceWaterImage,
    alt: 'First Faith Rice Water ingredient',
  },
  {
    name: 'Vitamin B5',
    category: 'Active',
    description: 'Featured in the Cleanser and Serum formulas.',
    products: [
      { label: 'Cleanser', href: '/products/cleanser' },
      { label: 'Serum', href: '/products/serum' },
    ],
    image: vitaminB5Image,
    alt: 'First Faith Vitamin B5 ingredient',
  },
  {
    name: 'Snail Mucin',
    category: 'Active',
    description: 'A hero ingredient featured in the First Faith Serum formula.',
    products: [{ label: 'Serum', href: '/products/serum' }],
    image: snailMucinImage,
    alt: 'First Faith Snail Mucin ingredient',
  },
  {
    name: 'Niacinamide',
    category: 'Active',
    description: 'A purposeful cosmetic active used across multiple First Faith formulas.',
    products: [
      { label: 'Sunscreen', href: '/products/sunscreen' },
      { label: 'Cleanser', href: '/products/cleanser' },
      { label: 'Serum', href: '/products/serum' },
      { label: 'Clay Mask', href: '/products/clay-mask' },
    ],
    image: niacinamideImage,
    alt: 'First Faith Niacinamide ingredient',
  },
  {
    name: 'Hyaluronic Acid',
    category: 'Active',
    description: 'A hydration-focused ingredient used in selected First Faith formulas.',
    products: [
      { label: 'Sunscreen', href: '/products/sunscreen' },
      { label: 'Cleanser', href: '/products/cleanser' },
      { label: 'Serum', href: '/products/serum' },
    ],
    image: hyaluronicAcidImage,
    alt: 'First Faith Hyaluronic Acid ingredient',
  },
  {
    name: 'Shea Butter',
    category: 'Botanical',
    description: 'A rich emollient featured as a hero ingredient in Body Butter.',
    products: [{ label: 'Body Butter', href: '/products/body-butter' }],
    image: sheaButterImage,
    alt: 'First Faith Shea Butter ingredient',
  },
  {
    name: 'Oat Kernel',
    category: 'Botanical',
    description: 'A botanical ingredient featured in the Body Butter formula.',
    products: [{ label: 'Body Butter', href: '/products/body-butter' }],
    image: oatKernelImage,
    alt: 'First Faith Oat Kernel ingredient',
  },
  {
    name: 'Moroccan Lava Clay',
    category: 'Mineral',
    description: 'A clay ingredient featured as a hero ingredient in Clay Mask.',
    products: [{ label: 'Clay Mask', href: '/products/clay-mask' }],
    image: moroccanLavaClayImage,
    alt: 'First Faith Moroccan Lava Clay ingredient',
  },
  {
    name: 'Alpha Arbutin',
    category: 'Active',
    description: 'A purposeful cosmetic active featured in Clay Mask.',
    products: [{ label: 'Clay Mask', href: '/products/clay-mask' }],
    image: alphaArbutinImage,
    alt: 'First Faith Alpha Arbutin ingredient',
  },
  {
    name: 'Centella Asiatica',
    category: 'Botanical',
    description: 'A botanical ingredient featured in the Sunscreen formula.',
    products: [{ label: 'Sunscreen', href: '/products/sunscreen' }],
    image: centellaAsiaticaImage,
    alt: 'First Faith Centella Asiatica ingredient',
  },
];

const FEATURED_INGREDIENTS = [
  {
    name: 'Rice Water',
    text: 'A gentle botanical that brings a calm, comfortable tone to the daily cleanse.',
    image: riceWaterImage,
    alt: 'First Faith Rice Water ingredient detail',
  },
  {
    name: 'Snail Mucin',
    text: 'A hero active selected for the serum ritual and its soft, conditioned finish.',
    image: snailMucinImage,
    alt: 'First Faith Snail Mucin ingredient detail',
  },
  {
    name: 'Shea Butter',
    text: 'A rich botanical emollient chosen for body rituals that feel comforting and grounded.',
    image: sheaButterImage,
    alt: 'First Faith Shea Butter ingredient detail',
  },
  {
    name: 'Moroccan Lava Clay',
    text: 'A mineral-led texture for a clarifying, considered finish in the clay mask ritual.',
    image: moroccanLavaClayImage,
    alt: 'First Faith Moroccan Lava Clay ingredient detail',
  },
];

function IngredientCard({ ingredient }: { ingredient: IngredientEntry }) {
  return (
    <article className="ingredient-card">
      <div className="ingredient-media">
        <Image
          src={ingredient.image}
          alt={ingredient.alt}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
      </div>
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <span className="eyebrow">{ingredient.category}</span>
        <h2 className="ingredient-card-title">{ingredient.name}</h2>
        <p className="ingredient-desc">{ingredient.description}</p>
        <div className="ingredient-found-in">
          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ff-burgundy)', fontWeight: 600, marginBottom: '0.4rem' }}>
            Found in
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {ingredient.products.map((product) => (
              <Link key={product.href} href={product.href} className="ingredient-link">
                {product.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function IngredientsPage() {
  return (
    <>
      <section className="page-intro">
        <div className="site-shell">
          <p className="eyebrow">Inside the formula</p>
          <h1 className="display-title">
            The ingredients<br />
            with intention.
          </h1>
          <p style={{ marginTop: '1.25rem', maxWidth: '36rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.75 }}>
            Botanical ingredients and purposeful actives, selected for the role they play in a balanced routine.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="site-shell">
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div>
              <p className="section-kicker">Ingredient catalog</p>
              <h2 className="section-title">Formulation library</h2>
            </div>
          </div>
          <div className="ingredients-grid">
            {INGREDIENTS.map((ingredient) => (
              <IngredientCard key={ingredient.name} ingredient={ingredient} />
            ))}
          </div>
        </div>
      </section>

      <section className="story-band">
        <div className="site-shell story-layout" style={{ maxWidth: '1080px' }}>
          <p className="section-kicker">Hero ingredients</p>
          <h2 className="story-title">Considered actives in the spotlight</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '2.5rem', textAlign: 'left' }}>
            {FEATURED_INGREDIENTS.map((item) => (
              <div key={item.name} style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(32, 28, 27, 0.08)', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 8px 24px rgba(32, 28, 27, 0.03)' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem', background: 'var(--ff-blush-soft)' }}>
                  <Image src={item.image} alt={item.alt} fill style={{ objectFit: 'cover' }} sizes="(min-width: 768px) 20vw, 50vw" />
                </div>
                <h3 style={{ fontFamily: 'var(--ff-font-display), Georgia, serif', fontSize: '1.3rem', color: 'var(--ff-charcoal)', margin: 0 }}>{item.name}</h3>
                <p style={{ marginTop: '0.45rem', fontSize: '0.86rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="site-shell story-layout">
          <p className="section-kicker">Formula philosophy</p>
          <h2 className="story-title">Nature, selected with purpose.</h2>
          <p className="story-text">
            Botanical ingredients and purposeful cosmetic actives are brought together within thoughtfully designed formulas, creating a ritual that feels grounded, balanced, and beautifully considered.
          </p>
        </div>
      </section>
    </>
  );
}


