import type { Metadata } from 'next';
import Image from 'next/image';
import { apiFetch } from '../../../lib/api';
import ingredientImage from '../../../img/IMG-20260831-WA0016.jpg';

export const metadata: Metadata = { title: 'Ingredients', description: 'The botanicals and actives behind every First Faith formulation.' };

interface IngredientListItem { id: string; name: string; description: string | null; }

export default async function IngredientsPage() {
  const ingredients = await apiFetch<IngredientListItem[]>('/ingredients').catch(() => []);
  return <>
    <section className="page-intro"><div className="site-shell px-6 md:px-10"><p className="eyebrow">Inside the formula</p><h1 className="display-title">The ingredients<br />with intention.</h1><p className="mt-8 max-w-xl text-base leading-8 text-charcoal-soft">Botanical ingredients and purposeful actives, selected for the role they play in a balanced routine.</p></div></section>
    <section className="site-shell grid gap-10 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:px-10 md:py-28"><div className="relative min-h-[420px] overflow-hidden bg-blush"><Image src={ingredientImage} alt="First Faith ingredients" fill className="object-cover" sizes="40vw" /></div><div><p className="eyebrow">Our library</p>{ingredients.length > 0 ? <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">{ingredients.map((ingredient, index) => <article key={ingredient.id} className="border-t border-stone pt-4"><span className="text-xs text-burgundy">{String(index + 1).padStart(2, '0')}</span><h2 className="mt-5 font-display text-2xl text-charcoal">{ingredient.name}</h2>{ingredient.description && <p className="mt-3 text-sm leading-7 text-charcoal-soft">{ingredient.description}</p>}</article>)}</div> : <p className="mt-8 text-charcoal-soft">Ingredient stories are being prepared.</p>}</div></section>
  </>;
}
