import type { Metadata } from 'next';
import Image from 'next/image';
import storyImage from '../../../img/IMG-20260831-WA0009.jpg';
import ritualImage from '../../../img/IMG-20260831-WA0013.jpg';
import { Button } from '../../../components/ui/Button';

export const metadata: Metadata = { title: 'About', description: 'First Faith — Perfect Blend of Nature & Science.' };

export default function AboutPage() {
  return (
    <>
      <section className="page-intro"><div className="site-shell px-6 md:px-10"><p className="eyebrow">The First Faith philosophy</p><h1 className="display-title">Care is a ritual, not a rush.</h1><p className="mt-8 max-w-xl text-base leading-8 text-charcoal-soft">We believe effective skincare is not about choosing between nature and science. It is about bringing them together thoughtfully.</p></div></section>
      <section className="site-shell grid gap-10 px-6 py-20 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-28"><div className="relative min-h-[500px] overflow-hidden bg-blush"><Image src={storyImage} alt="First Faith skincare product" fill className="object-cover" sizes="55vw" /></div><div className="flex flex-col justify-center md:px-8"><p className="eyebrow">A modern point of view</p><p className="mt-5 font-display text-4xl leading-tight text-charcoal">Botanicals give a formula its soul. Actives give it purpose.</p><p className="mt-7 leading-8 text-charcoal-soft">From Rice Water, Oat, Green Tea, and Centella to Niacinamide, Hyaluronic Acid, Ceramides, Alpha Arbutin, and Snail Mucin, our ingredients are selected for a reason and made to belong in real routines.</p></div></section>
      <section className="border-y border-charcoal/10 bg-blush/40"><div className="site-shell grid gap-8 px-6 py-20 md:grid-cols-3 md:px-10 md:py-24">{[['01','Botanicals','Inspired by nature and selected for skin-conditioning properties.'],['02','Actives','Purposeful cosmetic ingredients chosen for specific skincare roles.'],['03','Formulation','Balanced combinations designed for a sensorial, functional experience.']].map(([number,title,body]) => <article key={title} className="border-t border-charcoal/20 pt-5"><span className="text-xs text-burgundy">{number}</span><h2 className="mt-8 font-display text-3xl text-charcoal">{title}</h2><p className="mt-4 text-sm leading-7 text-charcoal-soft">{body}</p></article>)}</div></section>
      <section className="site-shell grid gap-10 px-6 py-20 md:grid-cols-[0.85fr_1.15fr] md:px-10 md:py-28"><div className="flex flex-col justify-center"><p className="eyebrow">Beyond just skincare</p><h2 className="mt-4 font-display text-5xl leading-none text-charcoal md:text-7xl">Small moments. Real care.</h2><Button href="/shop" className="mt-9 self-start">Explore the collection</Button></div><div className="relative min-h-[440px] overflow-hidden bg-blush"><Image src={ritualImage} alt="First Faith skincare ritual" fill className="object-cover" sizes="55vw" /></div></section>
    </>
  );
}
