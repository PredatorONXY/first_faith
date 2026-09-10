import { MetadataRoute } from 'next';
import { getPublishedProducts } from '../services/products';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://firstfaith.example.com';
  const products = await getPublishedProducts().catch(() => []);

  const staticRoutes = ['', '/shop', '/about', '/ingredients', '/contact'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...productRoutes];
}
