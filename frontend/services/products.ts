import { apiFetch } from '../lib/api';
import { Product } from '../types/product';

export function getPublishedProducts() {
  return apiFetch<Product[]>('/products');
}

export function getProductBySlug(slug: string) {
  return apiFetch<Product>(`/products/${slug}`);
}
