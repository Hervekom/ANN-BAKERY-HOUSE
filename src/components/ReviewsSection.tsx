import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  MessageSquarePlus,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { MENU_ITEMS } from '../data/menu';
import { createReview, deleteReview, updateReview } from '../services/api';
import { CustomerReview, CustomerUser } from '../types/account';

interface ReviewsSectionProps {
  user: CustomerUser | null;
  approvedReviews: CustomerReview[];
  averageRating: number | null;
  approvedCount: number;
  myReviews: CustomerReview[];
  loadingReviews: boolean;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenAdmin: () => void;
  onRefreshReviews: () => Promise<void>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const MY_STATUS_STYLE: Record<
  CustomerReview['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending Moderation',
    className: 'border-[#FD8F00]/45 bg-[#FDD364]/25 text-[#111111]',
  },
  approved: {
    label: 'Approved & Published',
    className: 'border-[#3C5826]/35 bg-[#3C5826]/12 text-[#3C5826]',
  },
  rejected: {
    label: 'Not Approved',
    className: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
  },
};

export default function ReviewsSection({
  user,
  approvedReviews,
  averageRating,
  approvedCount,
  myReviews,
  loadingReviews,
  onOpenAuth,
  onOpenAdmin,
  onRefreshReviews,
}: ReviewsSectionProps) {
  const [rating, setRating] = useState(5);
  const [productId, setProductId] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editProductId, setEditProductId] = useState('');
  const [editComment, setEditComment] = useState('');
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [myReviewsError, setMyReviewsError] = useState<string | null>(null);

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (comment.trim().length < 5) {
      setFormError('Please write at least 5 characters in your review.');
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        rating,
        productId: productId || null,
        comment: comment.trim(),
      });
      setComment('');
      setProductId('');
      setRating(5);
      setFormSuccess(
        'Thank you! Your review has been submitted with Pending status and will appear publicly once approved.',
      );
      await onRefreshReviews();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to submit your review.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (review: CustomerReview) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditProductId(review.productId ?? '');
    setEditComment(review.comment);
    setMyReviewsError(null);
  };

  const handleSaveEdit = async (reviewId: string) => {
    setMyReviewsError(null);
    if (editComment.trim().length < 5) {
      setMyReviewsError('Review text must be at least 5 characters.');
      return;
    }

    setBusyReviewId(reviewId);
    try {
      await updateReview(reviewId, {
        rating: editRating,
        productId: editProductId || null,
        comment: editComment.trim(),
      });
      setEditingId(null);
      await onRefreshReviews();
    } catch (err) {
      setMyReviewsError(
        err instanceof Error ? err.message : 'Unable to save review changes.',
      );
    } finally {
      setBusyReviewId(null);
    }
  };

  const handleDeleteOwn = async (reviewId: string) => {
    setMyReviewsError(null);
    setBusyReviewId(reviewId);
    try {
      await deleteReview(reviewId);
      if (editingId === reviewId) {
        setEditingId(null);
      }
      await onRefreshReviews();
    } catch (err) {
      setMyReviewsError(
        err instanceof Error ? err.message : 'Unable to delete review.',
      );
    } finally {
      setBusyReviewId(null);
    }
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="border-t border-[#E8DFC8] bg-[#FAF6EE] py-12 sm:py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Heading & Genuine Summary */}
        <div className="flex flex-col gap-5 border-b border-[#E8DFC8] pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-[2px] w-6 bg-[#3C5826]" />
              <p className="text-xs font-semibold tracking-[0.16em] text-[#3C5826] uppercase">
                Customer Reviews
              </p>
            </div>
            <h2
              id="reviews-heading"
              className="font-display text-balance mt-2 text-3xl font-bold text-[#111111] sm:text-4xl md:text-5xl"
            >
              Shared by Our Customers
            </h2>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#5C5952] sm:text-base">
              Real feedback from ANN BAKERY HOUSE guests. Every submitted review is reviewed before publishing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {approvedCount > 0 && averageRating !== null ? (
              <div className="rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] px-4 py-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-[#FD8F00] text-[#FD8F00]" aria-hidden="true" />
                  <span className="tabular-nums font-display text-2xl font-bold text-[#111111]">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-[#5C5952]">
                    / 5 ({approvedCount} approved {approvedCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] px-4 py-2.5 text-xs font-medium text-[#5C5952]">
                Awaiting first published reviews
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Write a Review + Author's Own Reviews */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-5 shadow-xs sm:p-6">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-[#3C5826]" aria-hidden="true" />
                <h3 className="font-display text-2xl font-bold text-[#111111]">
                  Leave a Review
                </h3>
              </div>

              {!user ? (
                <div className="mt-3 space-y-4">
                  <p className="text-sm leading-relaxed text-[#5C5952]">
                    Sign in or create a free customer account to rate your favorite dishes, cakes, or breads and share feedback with ANN BAKERY HOUSE.
                  </p>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-[#3C5826] px-4 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D]"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-xl border border-[#3C5826] bg-[#FAF6EE] px-4 py-2.5 text-sm font-semibold text-[#3C5826] transition-colors hover:bg-[#FDD364]/25 hover:text-[#111111]"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                  <p className="text-xs text-[#5C5952]">
                    Posting as <strong className="text-[#111111]">{user.name}</strong>
                  </p>

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#AF140B]/30 bg-[#AF140B]/8 px-3 py-2 text-xs font-medium text-[#AF140B]"
                    >
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-lg border border-[#3C5826]/30 bg-[#3C5826]/10 px-3 py-2.5 text-xs leading-relaxed text-[#111111]"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#3C5826]"
                        aria-hidden="true"
                      />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Star Picker */}
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-[#111111]">
                      Your Rating
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Star rating"
                      className="flex items-center gap-1.5"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={rating === star}
                          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                          onClick={() => setRating(star)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E8DFC8] bg-[#FAF6EE] transition-colors hover:border-[#FD8F00]"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              star <= rating
                                ? 'fill-[#FD8F00] text-[#FD8F00]'
                                : 'text-[#DDD4BE]'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-1 text-xs font-semibold text-[#5C5952]">
                        {rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Optional Product Selector */}
                  <div>
                    <label
                      htmlFor="review-product"
                      className="mb-1.5 block text-xs font-semibold text-[#111111]"
                    >
                      Dish or Bakery Item (Optional)
                    </label>
                    <select
                      id="review-product"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                    >
                      <option value="">General ANN BAKERY HOUSE Experience</option>
                      {MENU_ITEMS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Review Comment */}
                  <div>
                    <label
                      htmlFor="review-comment"
                      className="mb-1.5 block text-xs font-semibold text-[#111111]"
                    >
                      Your Review
                    </label>
                    <textarea
                      id="review-comment"
                      rows={4}
                      required
                      minLength={5}
                      maxLength={1000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share what you enjoyed about our homemade meals, breads, cakes, or hospitality..."
                      className="w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#3C5826] focus:outline-none"
                    />
                  </div>

                  <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#5C5952]">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FD8F00]" aria-hidden="true" />
                    <span>
                      New reviews start as <strong>Pending</strong> and become visible publicly after moderation.
                    </span>
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#3C5826] px-5 py-3 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D] disabled:opacity-60"
                  >
                    {submitting ? 'Submitting Review...' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>

            {/* Signed-in Customer's Own Reviews (Pending / Approved / Rejected) */}
            {user && myReviews.length > 0 && (
              <div className="rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-5 shadow-xs sm:p-6">
                <h3 className="font-display text-2xl font-bold text-[#111111]">
                  Your Reviews ({myReviews.length})
                </h3>
                {myReviewsError && (
                  <p className="mt-2 text-xs font-medium text-[#AF140B]">{myReviewsError}</p>
                )}
                <ul className="mt-4 space-y-3.5">
                  {myReviews.map((review) => {
                    const badge = MY_STATUS_STYLE[review.status];
                    const isEditing = editingId === review.id;
                    const isBusy = busyReviewId === review.id;

                    return (
                      <li
                        key={review.id}
                        className="rounded-xl border border-[#EFE7D4] bg-[#FAF6EE] p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  aria-label={`Set rating to ${star}`}
                                  onClick={() => setEditRating(star)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E8DFC8] bg-[#FFFDF9]"
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      star <= editRating
                                        ? 'fill-[#FD8F00] text-[#FD8F00]'
                                        : 'text-[#DDD4BE]'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>

                            <select
                              value={editProductId}
                              onChange={(e) => setEditProductId(e.target.value)}
                              aria-label="Edited review product"
                              className="min-h-[40px] w-full rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 py-1.5 text-xs text-[#111111]"
                            >
                              <option value="">General ANN BAKERY HOUSE Experience</option>
                              {MENU_ITEMS.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>

                            <textarea
                              rows={3}
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              aria-label="Edit review comment"
                              className="w-full rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3 py-2 text-xs text-[#111111]"
                            />

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleSaveEdit(review.id)}
                                className="min-h-[38px] rounded-lg bg-[#3C5826] px-3.5 py-1.5 text-xs font-semibold text-[#FFFDF9] hover:bg-[#2F461D] disabled:opacity-60"
                              >
                                {isBusy ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="min-h-[38px] rounded-lg border border-[#DDD4BE] bg-[#FFFDF9] px-3.5 py-1.5 text-xs font-semibold text-[#111111]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-0.5 text-[#FD8F00]">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < review.rating
                                        ? 'fill-[#FD8F00] text-[#FD8F00]'
                                        : 'text-[#DDD4BE]'
                                    }`}
                                    aria-hidden="true"
                                  />
                                ))}
                              </div>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            {review.productName && (
                              <p className="mt-1.5 text-xs font-semibold text-[#3C5826]">
                                {review.productName}
                              </p>
                            )}
                            <p className="mt-1.5 text-sm leading-relaxed text-[#111111]">
                              {review.comment}
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E8DFC8] pt-2.5 text-xs">
                              <span className="text-[#5C5952]">{formatDate(review.createdAt)}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => startEdit(review)}
                                  className="inline-flex min-h-[34px] items-center gap-1 rounded-md px-2 font-semibold text-[#3C5826] hover:bg-[#FFFDF9]"
                                >
                                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleDeleteOwn(review.id)}
                                  className="inline-flex min-h-[34px] items-center gap-1 rounded-md px-2 font-semibold text-[#AF140B] hover:bg-[#FFFDF9]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Approved Public Reviews Feed */}
          <div className="lg:col-span-7">
            {loadingReviews ? (
              <div className="rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-8 text-center text-sm text-[#5C5952]">
                Loading customer reviews...
              </div>
            ) : approvedReviews.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-8 text-center">
                <Star className="h-9 w-9 text-[#FDD364]" aria-hidden="true" />
                <h3 className="font-display mt-3 text-2xl font-bold text-[#111111]">
                  No Published Reviews Yet
                </h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#5C5952]">
                  Approved customer reviews will appear here once submitted and reviewed by our team. Be the first guest to share your thoughts!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {approvedReviews.map((review) => (
                  <article
                    key={review.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5 text-[#FD8F00]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-[#FD8F00] text-[#FD8F00]'
                                  : 'text-[#DDD4BE]'
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-medium text-[#5C5952]">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {review.productName && (
                        <p className="mt-2.5 text-xs font-semibold text-[#3C5826]">
                          Reviewed: {review.productName}
                        </p>
                      )}

                      <p className="mt-2 text-sm leading-relaxed text-[#111111]">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>

                    <p className="mt-4 border-t border-[#EFE7D4] pt-3 text-xs font-semibold text-[#5C5952]">
                      — {review.authorName}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {/* Admin Moderation Access Link */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E8DFC8] bg-[#FFFDF9] px-3.5 py-1.5 text-xs font-semibold text-[#5C5952] transition-colors hover:border-[#3C5826] hover:text-[#3C5826]"
              >
                <ShieldCheck className="h-4 w-4 text-[#3C5826]" aria-hidden="true" />
                <span>Review Moderation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
