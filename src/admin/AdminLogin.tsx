import { useState } from 'react';
import { Lock } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { signInAdmin } from '../lib/auth';
import { Banner, Button, Field, TextInput } from './ui';

/**
 * Administrator sign-in using Supabase Auth.
 *
 * Only the email/password is sent to Supabase. Authorisation is decided by the
 * trusted `app_metadata.role` claim (see `src/lib/auth.ts`), never by anything
 * supplied here.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your administrator email and password.');
      return;
    }

    setBusy(true);
    const result = await signInAdmin(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
    // On success the auth listener in AdminApp updates the view.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6EE] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#E8DFC8] bg-[#FFFDF9] p-6 shadow-sm sm:p-8">
        <BrandLogo size="default" />

        <div className="mt-5 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#AF140B]/10 text-[#AF140B]">
            <Lock className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold leading-none text-[#111111]">
              Owner Dashboard
            </h1>
            <p className="mt-1 text-xs text-[#5C5952]">Sign in with your administrator account</p>
          </div>
        </div>

        {error && (
          <Banner kind="error" className="mt-5">
            {error}
          </Banner>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Email" htmlFor="admin-email">
            <TextInput
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </Field>

          <Field label="Password" htmlFor="admin-password">
            <TextInput
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 border-t border-[#E8DFC8] pt-4 text-[11px] leading-relaxed text-[#5C5952]">
          Access is restricted to accounts with the administrator role. All changes are protected by
          Supabase Row Level Security.
        </p>
      </div>
    </div>
  );
}
