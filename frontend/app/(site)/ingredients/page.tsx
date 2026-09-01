import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/api';

export const metadata: Metadata = {
  title: 'Ingredients',
  description: 'The botanicals and actives behind every First Faith formulation.',
};

interface IngredientListItem {
  id: string;
  name: string;
  description: string | null;
}

export default async function IngredientsPage() {
  const ingredients = await apiFetch<IngredientListItem[]>('/ingredients').catch(() => []);

  return (
    <div className="mx-auto max-w-site px-6 py-16 md:px-10">
      <h1 className="font-display text-3xl text-charcoal md:text-4xl">Ingredients</h1>
      <p className="mt-2 max-w-xl text-charcoal-soft">
        Every First Faith formulation combines botanical ingredients with purposeful cosmetic
        actives. Here's what goes into ours.
      </p>

      {ingredients.length > 0 ? (
        <dl className="mt-10 grid gap-8 md:grid-cols-2">
          {ingredients.map((ingredient) => (
            <div key={ingredient.id} className="border-t border-stone pt-4">
              <dt className="font-display text-lg text-charcoal">{ingredient.name}</dt>
              {ingredient.description && (
                <dd className="mt-1 text-sm text-charcoal-soft">{ingredient.description}</dd>
              )}
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-10 text-charcoal-soft">
          Ingredient details will appear here once added in the admin dashboard.
        </p>
      )}
    </div>
  );
}
