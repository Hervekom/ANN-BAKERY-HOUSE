import { useEffect, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import {
  getAdminSession,
  signOutAdmin,
  subscribeAdminSession,
  type AdminSessionInfo,
} from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import { Banner, Button, Card } from './ui';

/**
 * Root of the private /admin application.
 *
 * Session and authorisation come exclusively from Supabase Auth. A signed-in
 * user without `app_metadata.role === 'admin'` is refused here, and every write
 * is additionally enforced by RLS in the database.
 */
export default function AdminApp() {
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const info = await getAdminSession();
      if (active) {
        setSession(info);
        setLoading(false);
      }
    })();
    const unsubscribe = subscribeAdminSession((info) => {
      if (active) setSession(info);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <Card className="w-full max-w-md p-6 sm:p-8">
          <BrandLogo size="default" />
          <h1 className="font-display mt-4 text-2xl font-bold text-[#111111]">Owner Dashboard</h1>
          <Banner kind="warning" className="mt-4">
            Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>, then reload.
          </Banner>
        </Card>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <p className="text-sm text-[#5C5952]">Checking your session…</p>
      </Centered>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  if (!session.isAdmin) {
    return (
      <Centered>
        <Card className="w-full max-w-md p-6 sm:p-8">
          <BrandLogo size="default" />
          <h1 className="font-display mt-4 text-2xl font-bold text-[#111111]">Access restricted</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5C5952]">
            The account <strong className="text-[#111111]">{session.email}</strong> is signed in but
            does not hold the administrator role.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => void signOutAdmin()}>
            Sign out
          </Button>
        </Card>
      </Centered>
    );
  }

  return <AdminDashboard session={session} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6EE] px-4 py-10">
      {children}
    </div>
  );
}
