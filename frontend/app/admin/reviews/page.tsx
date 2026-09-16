'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type AdminReview = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { fullName?: string | null; email: string };
  product: { name: string };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  function loadReviews() {
    setLoading(true);
    apiFetch<AdminReview[]>('/reviews/admin/all')
      .then((data) => {
        setReviews(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load reviews');
        setLoading(false);
      });
  }

  async function handleStatusChange(id: string, newStatus: 'APPROVED' | 'REJECTED') {
    setError(null);
    try {
      await apiFetch(`/reviews/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      setActionMessage(`Review marked as ${newStatus.toLowerCase()}.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update review status');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    setError(null);
    try {
      await apiFetch(`/reviews/${id}`, { method: 'DELETE' });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setActionMessage('Review permanently removed.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    }
  }

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--ff-burgundy)' }}>Community & Moderation</p>
          <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--ff-charcoal)', marginTop: '0.25rem' }}>
            Customer Reviews
          </h1>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`admin-btn ${isActive ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                style={{ borderRadius: '20px', padding: '0.35rem 0.85rem' }}
              >
                {tab === 'ALL' ? 'All Reviews' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                {tab === 'PENDING' && reviews.filter((r) => r.status === 'PENDING').length > 0 && (
                  <span style={{
                    marginLeft: '0.4rem',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    background: isActive ? '#ffffff' : 'var(--ff-burgundy)',
                    color: isActive ? 'var(--ff-burgundy)' : '#ffffff',
                  }}>
                    {reviews.filter((r) => r.status === 'PENDING').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {actionMessage && (
        <div style={{ marginTop: '1.5rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.875rem', fontWeight: 600 }}>
          {actionMessage}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#fdf2f2', border: '1px solid #f8b4b4', color: 'var(--ff-burgundy)', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ marginTop: '2rem', color: 'var(--ff-charcoal-soft)' }}>Loading reviews…</p>}

      {!loading && filteredReviews.length === 0 && (
        <div style={{ marginTop: '2rem', padding: '3rem 1.5rem', textAlign: 'center', border: '1px solid var(--ff-stone)', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
          <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--ff-charcoal)' }}>No reviews found</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)', marginTop: '0.35rem' }}>
            {filter === 'PENDING' ? 'All customer reviews have been moderated.' : 'No customer reviews recorded yet.'}
          </p>
        </div>
      )}

      {!loading && filteredReviews.length > 0 && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '110px' }}>Rating</th>
                <th style={{ minWidth: '150px' }}>Product</th>
                <th style={{ minWidth: '180px' }}>Customer</th>
                <th style={{ minWidth: '220px' }}>Review</th>
                <th style={{ minWidth: '110px' }}>Status</th>
                <th style={{ minWidth: '110px' }}>Date</th>
                <th style={{ minWidth: '200px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review) => (
                <tr key={review.id}>
                  <td style={{ color: '#d97706', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    <span style={{ marginLeft: '0.35rem', fontSize: '0.75rem', color: 'var(--ff-charcoal)', fontWeight: 500 }}>
                      ({review.rating}/5)
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--ff-charcoal)' }}>{review.product.name}</td>
                  <td>
                    <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>
                      {review.user.fullName || 'Anonymous'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ff-charcoal-soft)', margin: '0.15rem 0 0' }}>
                      {review.user.email}
                    </p>
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    {review.title && (
                      <p style={{ fontWeight: 600, color: 'var(--ff-charcoal)', margin: 0 }}>
                        {review.title}
                      </p>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                      {review.body || 'No comment provided'}
                    </p>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      borderRadius: '999px',
                      background: review.status === 'APPROVED' ? '#ecfdf5' : review.status === 'PENDING' ? '#fef3c7' : '#fdf2f2',
                      color: review.status === 'APPROVED' ? '#047857' : review.status === 'PENDING' ? '#b45309' : '#b91c1c',
                      border: `1px solid ${review.status === 'APPROVED' ? '#a7f3d0' : review.status === 'PENDING' ? '#fde68a' : '#fecaca'}`,
                    }}>
                      {review.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)', whiteSpace: 'nowrap' }}>
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {review.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(review.id, 'APPROVED')}
                          className="admin-btn admin-btn-success"
                        >
                          Approve
                        </button>
                      )}
                      {review.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(review.id, 'REJECTED')}
                          className="admin-btn admin-btn-secondary"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(review.id)}
                        className="admin-btn admin-btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
