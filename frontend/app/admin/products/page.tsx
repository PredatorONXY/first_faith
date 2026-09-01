import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import type { Product } from '../../../types/product';

// In the full build, this route is wrapped by an admin-only server check
// (reading the Supabase session server-side and verifying role via
// GET /auth/me) before rendering — omitted here to keep this reference
// implementation focused on the CRUD pattern itself.
export default async function AdminProductsPage() {
  const products = await apiFetch<Product[]>('/products/admin/all', {
    next: { revalidate: 0 },
  }).catch(() => []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-charcoal">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-sm bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundy-dark"
        >
          Add product
        </Link>
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-stone text-charcoal-soft">
          <tr>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Size</th>
            <th className="py-2 font-medium">Price</th>
            <th className="py-2 font-medium">Stock</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone">
          {products.map((product) => {
            const variant = product.variants[0];
            return (
              <tr key={product.id}>
                <td className="py-3">
                  <Link href={`/admin/products/${product.id}`} className="text-charcoal hover:text-burgundy">
                    {product.name}
                  </Link>
                </td>
                <td className="py-3 text-charcoal-soft">{variant?.sizeLabel ?? '—'}</td>
                <td className="py-3 text-charcoal-soft">
                  {variant ? `₹${Number(variant.price).toLocaleString('en-IN')}` : 'Not set'}
                </td>
                <td className="py-3 text-charcoal-soft">{variant?.inventory?.stockQuantity ?? 0}</td>
                <td className="py-3 text-charcoal-soft">{(product as any).status ?? 'DRAFT'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <p className="mt-8 text-charcoal-soft">No products yet. Add your first one to get started.</p>
      )}
    </div>
  );
}
