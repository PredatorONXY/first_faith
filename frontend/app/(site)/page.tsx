import Image from 'next/image';
import { getPublishedProducts } from '../../services/products';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import heroImage from '../../img/IMG-20260831-WA0012.jpg';
import ritualImage from '../../img/IMG-20260831-WA0008.jpg';
import ingredientImage from '../../img/IMG-20260831-WA0016.jpg';

const APPROACH = [
  ['01', 'Botanicals', 'Plant-led ingredients selected for comfort, balance, and a sensorial daily ritual.'],
  ['02', 'Actives', 'Purposeful cosmetic ingredients chosen for what skin actually needs.'],
  ['03', 'Formulation', 'Modern textures and considered combinations that make consistency feel effortless.'],
];

export default async function HomePage() {
  const products = await getPublishedProducts().catch(() => []);

  return (
    <>
      <section className="site-shell grid min-h-[calc(100vh-5rem)] items-center gap-10 px-6 py-12 md:grid-cols-[0.88fr_1.12fr] md:px-10 md:py-20">
        <div className="reveal max-w-xl py-8 md:py-16">
          <p className="eyebrow">Perfect blend of nature &amp; science</p>
          <h1 className="mt-6 font-display text-[clamp(4rem,8vw,8rem)] leading-[0.86] tracking-[-0.06em] text-charcoal">Beyond just skincare.</h1>
          <p className="mt-8 max-w-md text-base leading-8 text-charcoal-soft md:text-lg">Thoughtfully selected botanicals. Purposeful cosmetic actives. Modern formulations for a more considered daily ritual.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/shop">Shop the collection</Button>
            <Button href="/about" variant="outline">Our philosophy</Button>
          </div>
        </div>
        <div className="reveal reveal-delay-1 relative min-h-[560px] overflow-hidden bg-blush md:min-h-[720px]">
          <Image src={heroImage} alt="First Faith skincare collection" fill priority className="object-cover" sizes="(min-width: 768px) 60vw, 100vw" />
          <div className="absolute bottom-6 left-6 border border-white/40 bg-white/75 px-5 py-4 backdrop-blur-sm">
            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-burgundy">First Faith / 01</p>
            <p className="mt-1 font-display text-xl text-charcoal">Mindfully made.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-charcoal/10 bg-blush/45">
        <div className="site-shell grid gap-10 px-6 py-20 md:grid-cols-[0.7fr_1.3fr] md:px-10 md:py-28">
          <p className="eyebrow">The First Faith point of view</p>
          <div>
            <p className="font-display text-4xl leading-tight text-charcoal md:text-6xl">Nature gives us the language. Science helps us refine the conversation.</p>
            <p className="mt-8 max-w-2xl text-base leading-8 text-charcoal-soft">We bring botanical ingredients and purposeful actives into a quieter kind of skincare: formulas designed to feel beautiful in your hands and make sense in your routine.</p>
          </div>
        </div>
      </section>

      <section className="site-shell px-6 py-20 md:px-10 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><p className="eyebrow">The essentials</p><h2 className="mt-3 font-display text-5xl text-charcoal md:text-6xl">Your daily ritual.</h2></div>
          <Button href="/shop" variant="ghost">View all products →</Button>
        </div>
        {products.length > 0 ? <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-12 text-charcoal-soft">The collection is being prepared.</p>}
      </section>

      <section className="site-shell grid gap-8 px-6 pb-20 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pb-28">
        <div className="relative min-h-[480px] overflow-hidden bg-blush"><Image src={ritualImage} alt="A First Faith skincare ritual" fill className="object-cover" sizes="(min-width: 768px) 55vw, 100vw" /></div>
        <div className="flex flex-col justify-center px-2 md:px-10"><p className="eyebrow">A considered approach</p><h2 className="mt-4 font-display text-5xl leading-[0.95] text-charcoal md:text-6xl">Good skin care, made personal.</h2><p className="mt-8 leading-8 text-charcoal-soft">From Rice Water and Oat to Niacinamide, Hyaluronic Acid, Ceramides, and Alpha Arbutin, every ingredient has a role in the ritual.</p><Button href="/ingredients" variant="ghost" className="mt-8 self-start">Explore ingredients →</Button></div>
      </section>

      <section className="bg-charcoal text-white"><div className="site-shell grid gap-12 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:px-10 md:py-28"><div><p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/50">Our approach</p><div className="relative mt-8 min-h-[280px] overflow-hidden"><Image src={ingredientImage} alt="First Faith ingredients" fill className="object-cover" sizes="35vw" /></div></div><div className="grid gap-8 md:grid-cols-3 md:pt-12">{APPROACH.map(([number, title, body]) => <article key={title} className="border-t border-white/20 pt-5"><span className="text-xs text-white/45">{number}</span><h3 className="mt-8 font-display text-3xl">{title}</h3><p className="mt-4 text-sm leading-7 text-white/60">{body}</p></article>)}</div></div></section>

      <section className="site-shell px-6 py-24 text-center md:px-10 md:py-32"><p className="eyebrow">Make space for your ritual</p><h2 className="mx-auto mt-5 max-w-3xl font-display text-6xl leading-[0.9] text-charcoal md:text-8xl">Your skin. Your ritual.</h2><Button href="/shop" className="mt-10">Shop all products</Button></section>
    </>
  );
}
