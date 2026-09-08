export type ProductContentEntry = {
  name: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  sizeLabel: string;
  heroIngredients: string[];
  powerIngredients: string[];
  benefits: string[];
};

export const productContentBySlug: Record<string, ProductContentEntry> = {
  'clay-mask': {
    name: 'Clay Mask',
    tagline: 'Red Moroccan Clay & Alpha Arbutin',
    shortDescription: 'Red Moroccan Clay & Alpha Arbutin',
    fullDescription:
      'A purifying clay mask combining Moroccan Lava Clay and Alpha Arbutin to help brighten, soothe and refresh skin while supporting a clean, hydrated feel.',
    sizeLabel: '100 ml',
    heroIngredients: ['Moroccan Lava Clay', 'Alpha Arbutin'],
    powerIngredients: ['Kaolin', 'Niacinamide', 'Licorice', 'Aloe'],
    benefits: ['Purifying', 'Brightening', 'Hydrating', 'Soothing', 'Purify', 'Brighten', 'Refresh', 'Soothe'],
  },
  cleanser: {
    name: 'Cleanser',
    tagline: 'Rice Water & Vitamin B5',
    shortDescription: 'Rice Water & Vitamin B5',
    fullDescription:
      'A gentle daily cleanser that combines Rice Water and Vitamin B5 to help cleanse, hydrate and refresh skin while supporting brightness and comfort.',
    sizeLabel: '100 g',
    heroIngredients: ['Rice Water', 'Vitamin B5'],
    powerIngredients: ['Niacinamide', 'Ceramide NP', 'Hyaluronic Acid', '3-O-Ethyl Ascorbic Acid'],
    benefits: ['Brightening', 'Hydration', 'Purifying', 'Cleanse', 'Hydrate', 'Refresh', 'Brighten'],
  },
  sunscreen: {
    name: 'Sunscreen',
    tagline: 'SPF 50 PA+++',
    shortDescription: 'SPF 50 PA+++',
    fullDescription:
      'A daily sunscreen combining SPF 50 PA+++ protection with hydration, barrier-supporting actives and antioxidant botanical care for everyday sun defense.',
    sizeLabel: '50 g',
    heroIngredients: ['Niacinamide', 'Ceramides'],
    powerIngredients: ['Hyaluronic Acid', 'Ectoin', 'Centella Asiatica', 'Green Tea'],
    benefits: ['Soothing Care', 'Moisture Lock', 'Skin Defense', 'Sun Defense', 'Moisture Support', 'Barrier Care', 'Antioxidant Care'],
  },
  serum: {
    name: 'Serum',
    tagline: 'Snail Mucin & Vitamin B5',
    shortDescription: 'Snail Mucin & Vitamin B5',
    fullDescription:
      'A lightweight serum that pairs Snail Mucin and Vitamin B5 to help nourish, revitalize and hydrate skin for a smoother, more conditioned feel.',
    sizeLabel: '30 ml',
    heroIngredients: ['Snail Mucin', 'Vitamin B5'],
    powerIngredients: ['Niacinamide', 'Hyaluronic Acid', 'Oat Extract', 'Allantoin'],
    benefits: ['Brightening', 'Nourishing', 'Revitalizing', 'Hydrate', 'Nourish', 'Condition', 'Revitalize'],
  },
  'body-butter': {
    name: 'Body Butter',
    tagline: 'Oat Kernel & Shea Butter',
    shortDescription: 'Oat Kernel & Shea Butter',
    fullDescription:
      'A deeply nourishing body butter with Oat Kernel Extract and Shea Butter to comfort, soften and support smooth, resilient skin.',
    sizeLabel: '200 g',
    heroIngredients: ['Shea Butter', 'Oat Kernel Extract'],
    powerIngredients: ['Glycerin', 'Vitamin E', 'Caprylic/Capric Triglyceride'],
    benefits: ['Deep Nourishment', 'Intense Moisture', 'Barrier Care', 'Comfort', 'Soft, Smooth Skin'],
  },
};

export function getProductContent(slug: string) {
  return productContentBySlug[slug] ?? null;
}
