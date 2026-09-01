export type IngredientRole = 'HERO' | 'POWER';

export interface Ingredient {
  ingredient: { id: string; name: string; description: string | null };
  role: IngredientRole;
}

export interface ProductVariant {
  id: string;
  sku: string;
  sizeLabel: string;
  price: string; // Decimal serialized as string
  isDefault: boolean;
  inventory: { stockQuantity: number } | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  howToUse: string | null;
  suitableSkinTypes: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  ingredients: Ingredient[];
}
