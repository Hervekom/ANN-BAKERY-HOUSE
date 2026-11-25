import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  bootstrapAdminPasscode,
  clearAdminToken,
  deleteAdminReview,
  fetchAdminReviews,
  fetchAdminStatus,
  loginAdminModerator,
  moderateAdminReview,
} from '../services/api';
import { AdminReview, AdminStatusResponse, ReviewStatus } from '../types/account';

interface AdminModerationModalProps {
  open: boolean;
  onClose: () => void;
  onReviewsChanged: () => void;
}

type AdminFilter = 'pending' | 'approved' | 'rejected' | 'all';

function formatReviewDate(iso: string): string {
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

export default function AdminModerationModal({
  open,
  onClose,
  onReviewsChanged,
}: AdminModerationModalProps) {
  const [statusInfo, setStatusInfo] = useState<AdminStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<AdminFilter>('pending');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAdminReviews = useCallback(async (nextFilter: AdminFilter) => {
    setLoadingReviews(true);
    setError(null);
    try {
      const res = await fetchAdminReviews(nextFilter);
      setReviews(res.reviews);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reviews.');
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const st = await fetchAdminStatus();
      setStatusInfo(st);
      if (st.authenticated) {
        await loadAdminReviews(filter);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify moderation status.');
    } finally {
      setLoadingStatus(false);
    }
  }, [filter, loadAdminReviews]);

  useEffect(() => {
    if (!open) return;
    void refreshStatus();
  }, [open, refreshStatus]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBootstrap = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (passcode.trim().length < 8) {
      setError('Administrator passcode must be at least 8 characters long.');
      return;
    }
    if (passcode.trim() !== confirmPasscode.trim()) {
      setError('Passcode and confirmation do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      await bootstrapAdminPasscode({
        passcode: passcode.trim(),
        confirmPasscode: confirmPasscode.trim(),
      });
      setPasscode('');
      setConfirmPasscode('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setAuthLoading(true);
    try {
      await loginAdminModerator(passcode.trim());
      setPasscode('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModerate = async (reviewId: string, nextStatus: ReviewStatus) => {
    setBusyId(reviewId);
    setError(null);
    try {
      await moderateAdminReview(reviewId, nextStatus);
      await loadAdminReviews(filter);
      onReviewsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update review status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setBusyId(reviewId);
    setError(null);
    try {
      await deleteAdminReview(reviewId);
      await loadAdminReviews(filter);
      onReviewsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove review.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdminSignOut = () => {
    clearAdminToken();
    setReviews([]);
    void refreshStatus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-moderation-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111111]/75 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close moderation panel"
          className="absolute right-3.5 top-3.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DFC8] bg-[#FFFDF9] text-[#111111] transition-colors hover:bg-[#FDD364]/40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-10">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#3C5826] uppercase">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Administrator Moderation</span>
          </div>
          <h2
            id="admin-moderation-title"
            className="font-display mt-1 text-3xl font-bold text-[#111111]"
          >
            Customer Review Moderation
          </h2>
          <p className="mt-1 text-sm text-[#5C5952]">
            Approve, reject, or remove customer reviews before they appear publicly on ANN BAKERY HOUSE.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#AF140B]/30 bg-[#AF140B]/10 px-3.5 py-2.5 text-xs font-medium text-[#AF140B]"
          >
            {error}
          </div>
        )}

        {loadingStatus ? (
          <p className="mt-6 text-sm text-[#5C5952]">Checking moderation session...</p>
        ) : !statusInfo?.authenticated ? (
          statusInfo && !statusInfo.configured ? (
            <form
              onSubmit={handleBootstrap}
              className="mt-5 space-y-3.5 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-5"
            >
              <p className="text-xs font-semibold tracking-wider text-[#3C5826] uppercase">
                First-Run Admin Setup
              </p>
              <p className="text-xs leading-relaxed text-[#5C5952]">
                No administrator passcode has been set yet. Choose a passcode (minimum 8 characters) to claim moderation access. Once set, this setup locks automatically.
              </p>
              <div>
                <label
                  htmlFor="admin-setup-passcode"
                  className="mb-1 block text-xs font-semibold text-[#111111]"
                >
                  Create Administrator Passcode
                </label>
                <input
                  id="admin-setup-passcode"
                  type="password"
                  required
                  minLength={8}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="At least 8 characters"
                  className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-setup-confirm"
                  className="mb-1 block text-xs font-semibold text-[#111111]"
                >
                  Confirm Passcode
                </label>
                <input
                  id="admin-setup-confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Re-enter passcode"
                  className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#3C5826] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D] disabled:opacity-60"
              >
                {authLoading ? 'Saving...' : 'Claim Moderation Access'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleAdminLogin}
              className="mt-5 space-y-3.5 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-5"
            >
              <label
                htmlFor="admin-login-passcode"
                className="block text-xs font-semibold text-[#111111]"
              >
                Administrator Passcode
              </label>
              <input
                id="admin-login-passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter moderator passcode"
                className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#3C5826] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D] disabled:opacity-60"
              >
                {authLoading ? 'Signing In...' : 'Open Moderation Queue'}
              </button>
            </form>
          )
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'pending', label: `Pending (${summary.pending})` },
                    { key: 'approved', label: `Approved (${summary.approved})` },
                    { key: 'rejected', label: `Rejected (${summary.rejected})` },
                    { key: 'all', label: `All (${summary.total})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFilter(tab.key);
                      void loadAdminReviews(tab.key);
                    }}
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === tab.key
                        ? 'border-[#3C5826] bg-[#3C5826] text-[#FFFDF9]'
                        : 'border-[#E8DFC8] bg-[#FFFDF9] text-[#5C5952] hover:text-[#111111]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAdminSignOut}
                className="text-xs font-semibold text-[#AF140B] underline-offset-4 hover:underline"
              >
                Lock Moderation
              </button>
            </div>

            {loadingReviews ? (
              <p className="py-6 text-center text-sm text-[#5C5952]">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-6 text-center text-sm text-[#5C5952]">
                No reviews in this queue.
              </div>
            ) : (
              <ul className="space-y-3">
                {reviews.map((review) => {
                  const isBusy = busyId === review.id;
                  return (
                    <li
                      key={review.id}
                      className="rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#111111]">
                            {review.authorName}
                          </p>
                          <p className="text-xs text-[#5C5952]">
                            {review.authorEmail} · {formatReviewDate(review.createdAt)}
                          </p>
                        </div>
                        <span className="rounded-md border border-[#E8DFC8] bg-[#FAF6EE] px-2.5 py-0.5 text-[11px] font-semibold uppercase text-[#111111]">
                          {review.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
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
                        {review.productName && (
                          <span className="text-xs font-semibold text-[#3C5826]">
                            · {review.productName}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-[#111111]">
                        {review.comment}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#EFE7D4] pt-3">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleModerate(review.id, 'approved')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#3C5826] px-3 py-1.5 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Approve</span>
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleModerate(review.id, 'rejected')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00] disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5 text-[#AF140B]" aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(review.id)}
                          className="ml-auto inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#AF140B]/25 bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#AF140B] transition-colors hover:bg-[#AF140B] hover:text-[#FFFDF9] disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
