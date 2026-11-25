import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  MessageSquare,
  Star,
  User,
  X,
} from 'lucide-react';
import { changeCustomerPassword, updateCustomerProfile } from '../services/api';
import { CustomerReview, CustomerUser } from '../types/account';

interface CustomerProfileModalProps {
  open: boolean;
  user: CustomerUser | null;
  myReviews: CustomerReview[];
  onClose: () => void;
  onUserUpdated: (user: CustomerUser) => void;
  onSignOut: () => void;
  onJumpToReviews: () => void;
}

const STATUS_BADGE: Record<
  CustomerReview['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending Approval',
    className: 'border-[#FD8F00]/40 bg-[#FDD364]/25 text-[#111111]',
  },
  approved: {
    label: 'Approved',
    className: 'border-[#3C5826]/30 bg-[#3C5826]/12 text-[#3C5826]',
  },
  rejected: {
    label: 'Not Published',
    className: 'border-[#AF140B]/30 bg-[#AF140B]/10 text-[#AF140B]',
  },
};

export default function CustomerProfileModal({
  open,
  user,
  myReviews,
  onClose,
  onUserUpdated,
  onSignOut,
  onJumpToReviews,
}: CustomerProfileModalProps) {
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setNameInput(user.name);
    setProfileNotice(null);
    setProfileError(null);
    setPasswordNotice(null);
    setPasswordError(null);
  }, [open, user]);

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

  if (!open || !user) return null;

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    setProfileNotice(null);

    if (nameInput.trim().length < 2) {
      setProfileError('Please enter at least 2 characters for your display name.');
      return;
    }

    setSavingName(true);
    try {
      const updated = await updateCustomerProfile(nameInput);
      onUserUpdated(updated);
      setProfileNotice('Your profile name has been updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to update your name.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changeCustomerPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordNotice(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Unable to update password.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111111]/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close customer profile"
          className="absolute right-3.5 top-3.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DFC8] bg-[#FFFDF9] text-[#111111] transition-colors hover:bg-[#FDD364]/40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-10">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#3C5826] uppercase">
            Customer Profile
          </p>
          <h2
            id="profile-modal-title"
            className="font-display mt-1 text-3xl font-bold text-[#111111]"
          >
            {user.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5C5952]">
            <Mail className="h-4 w-4 shrink-0 text-[#3C5826]" aria-hidden="true" />
            <span className="truncate">{user.email}</span>
          </p>
        </div>

        {/* Profile Details & Name Update */}
        <div className="mt-5 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-4 sm:p-5">
          <form onSubmit={handleSaveName} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#111111] uppercase">
              <User className="h-4 w-4 text-[#3C5826]" aria-hidden="true" />
              <span>Account Information</span>
            </div>

            <div>
              <label
                htmlFor="profile-display-name"
                className="mb-1 block text-xs font-semibold text-[#111111]"
              >
                Display Name
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingName}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#3C5826] px-4 py-2 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2F461D] disabled:opacity-60"
                >
                  {savingName ? 'Saving...' : 'Update Name'}
                </button>
              </div>
            </div>

            {profileError && (
              <p className="text-xs font-medium text-[#AF140B]">{profileError}</p>
            )}
            {profileNotice && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-[#3C5826]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{profileNotice}</span>
              </p>
            )}
          </form>

          {/* Security / Password Change */}
          <div className="mt-4 border-t border-[#EFE7D4] pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
                <KeyRound className="h-3.5 w-3.5 text-[#3C5826]" aria-hidden="true" />
                <span>Password &amp; Security</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((prev) => !prev);
                  setPasswordError(null);
                }}
                className="text-xs font-semibold text-[#3C5826] underline-offset-4 hover:underline"
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {passwordNotice && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#3C5826]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{passwordNotice}</span>
              </p>
            )}

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="mt-3 space-y-2.5">
                {passwordError && (
                  <p className="text-xs font-medium text-[#AF140B]">{passwordError}</p>
                )}
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  aria-label="Current password"
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  aria-label="New password"
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  className="min-h-[42px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3 py-2 text-sm text-[#111111] focus:border-[#3C5826] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-lg bg-[#111111] px-4 py-2 text-xs font-semibold text-[#FFFDF9] transition-colors hover:bg-[#2A2A2A] disabled:opacity-60"
                >
                  {savingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Customer's Submitted Reviews Summary */}
        <div className="mt-4 rounded-xl border border-[#E8DFC8] bg-[#FFFDF9] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#111111] uppercase">
              <MessageSquare className="h-4 w-4 text-[#FD8F00]" aria-hidden="true" />
              <span>Your Submitted Reviews ({myReviews.length})</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToReviews();
              }}
              className="text-xs font-semibold text-[#3C5826] underline-offset-4 hover:underline"
            >
              Manage in Reviews
            </button>
          </div>

          {myReviews.length === 0 ? (
            <p className="mt-2.5 text-xs leading-relaxed text-[#5C5952]">
              You have not submitted any reviews yet. Visit the Customer Reviews section to share your experience with ANN BAKERY HOUSE.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {myReviews.map((review) => {
                const badge = STATUS_BADGE[review.status];
                return (
                  <li
                    key={review.id}
                    className="rounded-lg border border-[#EFE7D4] bg-[#FAF6EE] p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[#FD8F00]">
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
                      <p className="mt-1.5 font-semibold text-[#3C5826]">
                        {review.productName}
                      </p>
                    )}
                    <p className="mt-1 leading-relaxed text-[#111111]">{review.comment}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sign Out */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#AF140B]/30 bg-[#FFFDF9] px-5 py-2.5 text-sm font-semibold text-[#AF140B] transition-colors hover:bg-[#AF140B] hover:text-[#FFFDF9] sm:w-auto"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
