'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPrimaryProductImage } from '../../../lib/productImages';
import { apiFetch } from '../../../lib/api';
import type { Product } from '../../../types/product';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Product[]>('/products/admin/all')
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load products');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>Catalog Management</p>
          <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', marginTop: '0.25rem' }}>
            Products
          </h1>
        </div>
      </div>

      {loading && <p style={{ marginTop: '2rem', color: 'var(--ff-charcoal-soft)' }}>Loading catalog products…</p>}

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '240px' }}>Product</th>
                <th style={{ minWidth: '120px' }}>Measurement</th>
                <th style={{ minWidth: '120px' }}>Price / MRP</th>
                <th style={{ minWidth: '120px' }}>Stock</th>
                <th style={{ minWidth: '120px' }}>Status</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const variant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];
                const primaryImg = getPrimaryProductImage(product.slug);
                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {primaryImg && (
                          <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'rgba(238,216,207,0.3)', border: '1px solid var(--ff-stone)' }}>
                            <Image
                              src={primaryImg.src}
                              alt={primaryImg.alt || product.name}
                              fill
                              style={{ objectFit: 'cover' }}
                              sizes="42px"
                            />
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="admin-btn-text"
                            style={{ padding: 0, fontSize: '0.95rem', fontWeight: 600 }}
                          >
                            {product.name}
                          </Link>
                          {product.tagline && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.2rem' }}>
                              {product.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ff-charcoal-soft)' }}>{variant?.sizeLabel ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--ff-charcoal)' }}>
                      {variant ? `₹${Number(variant.price).toLocaleString('en-IN')}` : 'Not set'}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: (variant?.inventory?.stockQuantity ?? 0) <= 5 ? 'var(--ff-burgundy)' : 'var(--ff-charcoal)',
                      }}>
                        {variant?.inventory?.stockQuantity ?? 0} units
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        borderRadius: '999px',
                        background: product.status === 'PUBLISHED' ? '#ecfdf5' : '#fef3c7',
                        color: product.status === 'PUBLISHED' ? '#047857' : '#b45309',
                        border: `1px solid ${product.status === 'PUBLISHED' ? '#a7f3d0' : '#fde68a'}`,
                      }}>
                        {product.status ?? 'DRAFT'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="admin-btn admin-btn-primary"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && products.length === 0 && !error && (
        <p style={{ marginTop: '2rem', color: 'var(--ff-charcoal-soft)' }}>No products found in the catalog.</p>
      )}
    </div>
  );
}
