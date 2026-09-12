/* eslint-disable @typescript-eslint/no-require-imports */
import { apiFetch } from '../lib/api';
import { Product } from '../types/product';

async function getDirectProductsService() {
  const { getCachedNestApp, ProductsService } = await import('first-faith-backend');
  const app = await getCachedNestApp();
  return app.get(ProductsService);
}

export async function getPublishedProducts(): Promise<Product[]> {
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

export async function getProductBySlug(slug: string): Promise<Product> {
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
