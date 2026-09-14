/* eslint-disable @typescript-eslint/no-require-imports */
import { apiFetch } from '../lib/api';
import { Product } from '../types/product';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

async function getDirectProductsService() {
  const { getCachedNestApp, ProductsService } = await import('first-faith-backend');
  const app = await getCachedNestApp();
  return app.get(ProductsService);
}

async function loadPublishedProducts(): Promise<Product[]> {
  if (typeof window === 'undefined') {
    try {
      const service = await getDirectProductsService();
      const products = await service.findAllPublished();
      return JSON.parse(JSON.stringify(products));
    } catch {
      return apiFetch<Product[]>('/products');
    }
  }
  return apiFetch<Product[]>('/products');
}

async function loadProductBySlug(slug: string): Promise<Product> {
  if (typeof window === 'undefined') {
    try {
      const service = await getDirectProductsService();
      const product = await service.findBySlug(slug);
      return JSON.parse(JSON.stringify(product));
    } catch {
      return apiFetch<Product>(`/products/${slug}`);
    }
  }
  return apiFetch<Product>(`/products/${slug}`);
}

// Catalog data changes infrequently, while product prices/inventory remain
// authoritative at cart/checkout time. A short server cache removes repeated
// Neon reads during navigation without making checkout trust stale values.
const getCachedPublishedProducts = unstable_cache(loadPublishedProducts, ['published-products'], {
  revalidate: 30,
  tags: ['catalog-products'],
});
const getCachedProductBySlug = unstable_cache(loadProductBySlug, ['product-by-slug'], {
  revalidate: 30,
  tags: ['catalog-products'],
});

export async function getPublishedProducts(): Promise<Product[]> {
  return typeof window === 'undefined' ? getCachedPublishedProducts() : loadPublishedProducts();
}

// React's request cache prevents generateMetadata and the page render from
// starting duplicate product reads during the same server render. The short
// shared cache above still handles warm navigations across requests.
export const getProductBySlug = cache(async (slug: string): Promise<Product> => {
  return typeof window === 'undefined' ? getCachedProductBySlug(slug) : loadProductBySlug(slug);
});
