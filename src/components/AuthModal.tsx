import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MessageCircle,
  UserPlus,
  X,
} from 'lucide-react';
import { BUSINESS_INFO } from '../data/menu';
import {
  loginCustomer,
  registerCustomer,
  requestPasswordReset,
} from '../services/api';
import { CustomerUser } from '../types/account';

export type AuthModalMode = 'login' | 'register' | 'reset';

interface AuthModalProps {
  open: boolean;
  initialMode: AuthModalMode;
  onClose: () => void;
  onAuthenticated: (user: CustomerUser) => void;
  whatsappDigits?: string;
}

export default function AuthModal({
  open,
  initialMode,
  onClose,
  onAuthenticated,
  whatsappDigits,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and password confirmation do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await loginCustomer({ email, password });
        onAuthenticated(user);
        onClose();
      } else if (mode === 'register') {
        const user = await registerCustomer({
          name,
          email,
          password,
          confirmPassword,
        });
        onAuthenticated(user);
        onClose();
      } else {
        const res = await requestPasswordReset(email);
        setSuccessMessage(res.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111111]/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account window"
          className="absolute right-3.5 top-3.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DFC8] bg-[#FAF6EE] text-[#111111] transition-colors hover:bg-[#FDD364]/40"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="pr-10">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#3C5826] uppercase">
            {BUSINESS_INFO.name} Account
          </p>
          <h2
            id="auth-modal-title"
            className="font-display mt-1 text-3xl font-bold text-[#111111]"
          >
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#5C5952]">
            {mode === 'login' &&
              'Sign in to view your profile and share or manage your customer reviews.'}
            {mode === 'register' &&
              'Create a customer account to review ANN BAKERY HOUSE dishes and baked goods.'}
            {mode === 'reset' &&
              'Enter the email address associated with your ANN BAKERY HOUSE account.'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Sign In / Create Account) */}
        {mode !== 'reset' && (
          <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-[#E8DFC8] bg-[#FAF6EE] p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`min-h-[42px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-[#3C5826] text-[#FFFDF9] shadow-xs'
                  : 'text-[#5C5952] hover:text-[#111111]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`min-h-[42px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-[#3C5826] text-[#FFFDF9] shadow-xs'
                  : 'text-[#5C5952] hover:text-[#111111]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#AF140B]/30 bg-[#AF140B]/8 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-[#AF140B]"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-4 space-y-2.5 rounded-xl border border-[#3C5826]/30 bg-[#3C5826]/10 px-3.5 py-3 text-xs leading-relaxed text-[#111111]"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3C5826]" aria-hidden="true" />
              <p>{successMessage}</p>
            </div>
            <a
              href={`https://wa.me/${whatsappDigits ?? BUSINESS_INFO.whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-[#3C5826] underline underline-offset-4 hover:text-[#AF140B]"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Contact ANN BAKERY HOUSE on WhatsApp</span>
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1.5 block text-xs font-semibold text-[#111111]"
              >
                Customer Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#3C5826] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-semibold text-[#111111]"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#3C5826] focus:outline-none"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-[#111111]"
                >
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs font-medium text-[#3C5826] underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter password'}
                  className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] pr-11 pl-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#3C5826] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#5C5952] hover:text-[#111111]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="mb-1.5 block text-xs font-semibold text-[#111111]"
              >
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="min-h-[44px] w-full rounded-lg border border-[#DDD4BE] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#111111] placeholder:text-[#5C5952]/70 focus:border-[#3C5826] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#3C5826] px-5 py-3 text-sm font-semibold text-[#FFFDF9] shadow-xs transition-colors hover:bg-[#2F461D] disabled:opacity-60"
          >
            {mode === 'login' && <LogIn className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />}
            {mode === 'register' && (
              <UserPlus className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
            )}
            {mode === 'reset' && (
              <KeyRound className="h-4 w-4 text-[#FDD364]" aria-hidden="true" />
            )}
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : 'Request Password Reset'}
            </span>
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-lg border border-[#E8DFC8] bg-[#FAF6EE] px-4 py-2 text-xs font-semibold text-[#111111] transition-colors hover:border-[#FD8F00]"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
