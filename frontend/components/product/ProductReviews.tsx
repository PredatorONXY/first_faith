'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getAccessToken } from '../../lib/api';
import { Button } from '../ui/Button';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  user: { fullName?: string | null };
};

export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadApprovedReviews = useCallback(() => {
    setLoading(true);
    apiFetch<Review[]>(`/reviews?productId=${productId}`)
      .then((data) => {
        setReviews(data);
        setLoading(false);
      })
      .catch(() => {
        setReviews([]);
        setLoading(false);
      });
  }, [productId]);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
    loadApprovedReviews();
  }, [loadApprovedReviews]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || body.trim().length < 5) {
      setFormError('Please share a review comment (minimum 5 characters).');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });

      setFormSuccess('Thank you for your feedback! Your review has been submitted for moderation and will be published once approved.');
      setTitle('');
      setBody('');
      setRating(5);
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : null;

  return (
    <section className="mt-16 border-t border-stone pt-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="eyebrow">Real Experiences</p>
          <h2 className="font-display text-3xl text-charcoal mt-1">Customer Reviews</h2>
          {reviewCount > 0 ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-amber-600 text-lg font-bold tracking-tight">
                {'★'.repeat(Math.round(Number(averageRating)))}{'☆'.repeat(5 - Math.round(Number(averageRating)))}
              </span>
              <span className="font-display text-xl text-charcoal">{averageRating}</span>
              <span className="text-sm text-charcoal-soft">
                ({reviewCount} {reviewCount === 1 ? 'verified review' : 'verified reviews'})
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-charcoal-soft">
              Be the first to review {productName}.
            </p>
          )}
        </div>

        <div>
          {isLoggedIn ? (
            !showForm && (
              <Button type="button" onClick={() => setShowForm(true)} className="btn-outline">
                Write a review
              </Button>
            )
          ) : (
            <p className="text-sm text-charcoal-soft">
              Purchased this item?{' '}
              <Link href={`/login?next=/products`} className="text-burgundy font-semibold underline">
                Sign in
              </Link>{' '}
              to leave a review.
            </p>
          )}
        </div>
      </div>

      {formSuccess && (
        <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {formSuccess}
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="mt-8 p-6 sm:p-8 border border-stone bg-white/70 rounded-xl max-w-xl">
          <div className="flex justify-between items-center pb-4 border-b border-stone">
            <h3 className="font-display text-xl text-charcoal">Write your review</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-charcoal-soft hover:text-charcoal uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-soft mb-1">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    style={{ color: star <= rating ? '#d97706' : '#d1d5db' }}
                    aria-label={`Rate ${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="reviewTitle" className="form-label">Title (optional)</label>
              <input
                id="reviewTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                placeholder="e.g. Gentle and deeply hydrating"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="reviewBody" className="form-label">Review *</label>
              <textarea
                id="reviewBody"
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="form-input"
                placeholder="Share your experience with the texture, finish, and skin feel…"
              />
            </div>

            {formError && (
              <p className="text-xs font-semibold text-burgundy" role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-charcoal-soft">Loading reviews…</p>
        ) : reviewCount === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone rounded-lg bg-white/40">
            <p className="font-display text-lg text-charcoal">No customer reviews yet</p>
            <p className="text-xs text-charcoal-soft mt-1">
              Be the first to share your thoughts on this ritual essential.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-stone bg-white/70 p-6 rounded-lg space-y-2 text-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="text-amber-600 tracking-tight font-bold">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="text-xs text-charcoal-soft">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {review.title && (
                  <h4 className="font-semibold text-charcoal text-base">{review.title}</h4>
                )}

                <p className="text-charcoal leading-relaxed">{review.body}</p>

                <p className="text-xs text-charcoal-soft pt-2 border-t border-stone/50">
                  By {review.user.fullName || 'Verified Customer'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
