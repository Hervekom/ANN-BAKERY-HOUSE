import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Administrative authentication via Supabase Auth.
 *
 * IMPORTANT (decision D1): administrator authorization is proven ONLY by the
 * signed JWT claim `app_metadata.role === 'admin'`. `app_metadata` is
 * server-controlled and cannot be set by the client, unlike `user_metadata`.
 *
 * `isAdminUser()` below is used purely for UI gating. It is NOT a security
 * boundary — every write is independently enforced by Row Level Security in
 * the database using the same `app_metadata.role` claim.
 */

export interface AdminSessionInfo {
  email: string;
  userId: string;
  isAdmin: boolean;
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;
  return appMetadata?.role === 'admin';
}

function toSessionInfo(session: Session | null): AdminSessionInfo | null {
  if (!session?.user) return null;
  return {
    email: session.user.email ?? '',
    userId: session.user.id,
    isAdmin: isAdminUser(session.user),
  };
}

export async function getAdminSession(): Promise<AdminSessionInfo | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return toSessionInfo(data.session);
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ session: AdminSessionInfo | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      session: null,
      error: 'Supabase is not configured. Set the environment variables before signing in.',
    };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { session: null, error: error.message };
  }
  return { session: toSessionInfo(data.session), error: null };
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Subscribes to auth changes (login, logout, token refresh). Returns an
 * unsubscribe function. Used to keep the dashboard in sync with the session.
 */
export function subscribeAdminSession(
  callback: (session: AdminSessionInfo | null) => void,
): () => void {
  if (!supabase) {
    callback(null);
    return () => undefined;
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toSessionInfo(session));
  });
  return () => data.subscription.unsubscribe();
}
