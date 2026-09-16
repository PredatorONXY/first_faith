'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';
import type { Product } from '../../../../types/product';

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [status, setStatus] = useState<string>('PUBLISHED');
  const [tagline, setTagline] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    apiFetch<Product>(`/products/admin/detail/${params.id}`)
      .then((prod) => {
        setProduct(prod);
        setName(prod.name);
        setTagline(prod.tagline || '');
        setShortDescription(prod.shortDescription || '');
        setStatus(prod.status || 'PUBLISHED');
        const defaultVariant = prod.variants?.find((v) => v.isDefault) || prod.variants?.[0];
        if (defaultVariant) {
          setPrice(String(Number(defaultVariant.price)));
          setSizeLabel(defaultVariant.sizeLabel || '');
          setStockQuantity(String(defaultVariant.inventory?.stockQuantity ?? 0));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load product'));
  }, [params?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!params?.id) return;

    const numPrice = Number(price);
    const numStock = Number(stockQuantity);

    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please enter a valid non-negative price / MRP.');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setError('Please enter a valid non-negative stock quantity.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await apiFetch<Product>(`/products/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || undefined,
          shortDescription: shortDescription.trim() || undefined,
          status,
          price: numPrice,
          sizeLabel: sizeLabel.trim() || undefined,
          stockQuantity: numStock,
        }),
      });
      setProduct(updated);
      setSuccess('Product successfully updated.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  }

  if (error && !product) {
    return (
      <div style={{ padding: '3rem 0' }}>
        <p style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>{error}</p>
        <Link href="/admin/products" className="admin-btn-text" style={{ marginTop: '1rem', display: 'inline-block' }}>
          ← Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return <div style={{ padding: '3rem 0', color: 'var(--ff-charcoal-soft)' }}>Loading product details…</div>;
  }

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div>
        <Link href="/admin/products" className="admin-btn-text" style={{ padding: 0 }}>
          ← Back to products
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.75rem' }}>
          <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', margin: 0 }}>
            Edit {product.name}
          </h1>
          <span
            style={{
              display: 'inline-block',
              padding: '0.35rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '999px',
              background: status === 'PUBLISHED' ? '#ecfdf5' : '#fef3c7',
              color: status === 'PUBLISHED' ? '#047857' : '#b45309',
              border: `1px solid ${status === 'PUBLISHED' ? '#a7f3d0' : '#fde68a'}`,
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {success && (
        <div style={{ marginTop: '1.5rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.875rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="admin-card" style={{ marginTop: '2rem', maxWidth: '680px', display: 'grid', gap: '1.25rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="name" className="form-label">Product Name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="price" className="form-label">MRP / Price (₹)</label>
            <input
              id="price"
              type="number"
              step="1"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="form-input"
              placeholder="e.g. 695"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="sizeLabel" className="form-label">Measurement / Size</label>
            <input
              id="sizeLabel"
              type="text"
              required
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              className="form-input"
              placeholder="e.g. 100 gm, 50 ml"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="stockQuantity" className="form-label">Inventory Stock</label>
            <input
              id="stockQuantity"
              type="number"
              step="1"
              min="0"
              required
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="form-input"
              placeholder="e.g. 50"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="status" className="form-label">Publication Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input"
            >
              <option value="PUBLISHED">Published (Visible on store)</option>
              <option value="DRAFT">Draft (Hidden from store)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="tagline" className="form-label">Tagline (optional)</label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="shortDescription" className="form-label">Short Description (optional)</label>
          <textarea
            id="shortDescription"
            rows={3}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="form-input"
          />
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--ff-stone)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Link href="/admin/products" className="admin-btn admin-btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="admin-btn admin-btn-primary" style={{ minHeight: '44px', padding: '0.6rem 1.75rem' }}>
            {saving ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
