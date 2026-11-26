import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, Star, Trash2 } from 'lucide-react';
import type { AdminSessionInfo } from '../../lib/auth';
import {
  countReviewsByStatus,
  deleteReview,
  listReviews,
  setReviewStatus,
  type AdminReviewSummary,
} from '../../lib/adminData';
import { ReviewRow, ReviewStatus } from '../../lib/dbTypes';
import { formatDateTime } from '../../lib/format';
import { ErrorNotice, MigrationNotice } from '../notices';
import { Button, Card, EmptyState, SectionTitle, Spinner } from '../ui';

type Filter = ReviewStatus | 'all';

const TABS: Array<{ id: Filter; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: 'border-[#FD8F00]/45 bg-[#FDD364]/25 text-[#7A4A00]',
  approved: 'border-[#3C5826]/35 bg-[#3C5826]/12 text-[#3C5826]',
  rejected: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
};

export default function ReviewsSection({ session }: { session: AdminSessionInfo }) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState<AdminReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (activeFilter: Filter) => {
      setLoading(true);
      const [list, counts] = await Promise.all([
        listReviews(activeFilter),
        countReviewsByStatus(),
      ]);
      setMissing(list.missingRelation || counts.missingRelation);
      setError(list.error ?? counts.error);
      setReviews(list.data ?? []);
      setSummary(counts.data);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const moderate = async (review: ReviewRow, status: ReviewStatus) => {
    setBusyId(review.id);
    setError(null);
    const result = await setReviewStatus(review.id, status, session.userId);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    await load(filter);
  };

  const remove = async (review: ReviewRow) => {
    if (!window.confirm(`Delete the review by ${review.author_name}? This cannot be undone.`)) return;
    setBusyId(review.id);
    setError(null);
    const result = await deleteReview(review.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      setMissing(result.missingRelation);
      return;
    }
    await load(filter);
  };

  const countFor = (id: Filter): number | null => {
    if (!summary) return null;
    if (id === 'all') return summary.total;
    return summary[id];
  };

  return (
    <div>
      <SectionTitle
        title="Reviews"
        description="Approve, reject or delete customer reviews. Historical review content is preserved."
      />

      {missing && <div className="mt-5"><MigrationNotice /></div>}
      {error && <div className="mt-5"><ErrorNotice message={error} /></div>}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const isActive = filter === tab.id;
          const count = countFor(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-[#7E22CE] bg-[#7E22CE] text-[#FFFDF9]'
                  : 'border-[#E8DFC8] bg-[#FFFDF9] text-[#5C5952] hover:text-[#111111]'
              }`}
            >
              {tab.label}
              {count !== null && (
                <span className={`tabular-nums ${isActive ? 'text-[#FDD364]' : 'text-[#5C5952]/75'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading ? (
          <Spinner label="Loading reviews…" />
        ) : reviews.length === 0 ? (
          <EmptyState
            title={`No ${filter === 'all' ? '' : filter} reviews`}
            description="Reviews submitted by customers will appear here for moderation."
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const isBusy = busyId === review.id;
              return (
                <Card key={review.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-[#FD8F00]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating ? 'fill-[#FD8F00] text-[#FD8F00]' : 'text-[#DDD4BE]'
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-[#111111]">{review.author_name}</span>
                      {review.author_email && (
                        <span className="text-xs text-[#5C5952]">{review.author_email}</span>
                      )}
                    </div>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[review.status]}`}
                    >
                      {review.status}
                    </span>
                  </div>

                  {review.product_name && (
                    <p className="mt-2 text-xs font-semibold text-[#3C5826]">{review.product_name}</p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-[#111111]">{review.comment}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DFC8] pt-3">
                    <p className="text-[11px] text-[#5C5952]">
                      Submitted {formatDateTime(review.created_at)}
                      {review.moderated_at && ` · moderated ${formatDateTime(review.moderated_at)}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {review.status !== 'approved' && (
                        <Button
                          variant="ghost"
                          className="min-h-[36px] px-3 text-xs text-[#3C5826] hover:bg-[#3C5826]/10"
                          disabled={isBusy}
                          onClick={() => void moderate(review, 'approved')}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Approve
                        </Button>
                      )}
                      {review.status !== 'rejected' && (
                        <Button
                          variant="ghost"
                          className="min-h-[36px] px-3 text-xs text-[#7A4A00] hover:bg-[#FDD364]/25"
                          disabled={isBusy}
                          onClick={() => void moderate(review, 'rejected')}
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="min-h-[36px] px-3 text-xs"
                        disabled={isBusy}
                        onClick={() => void remove(review)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
