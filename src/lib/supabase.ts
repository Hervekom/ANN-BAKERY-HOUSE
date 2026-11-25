import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase client for the ANN BAKERY HOUSE frontend.
 *
 * This module only ever reads the public project URL and the Publishable key.
 * The service-role / secret key must NEVER be placed in frontend code.
 *
 * Configuration is read from `.env.local` (see `.env.example`):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * If the environment is not configured, `supabase` is `null` and the public
 * website falls back to its bundled static content. Nothing here throws at
 * import time, so the app still boots without Supabase credentials.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        // Revalidate every Supabase request so content edited in the dashboard
        // is never masked by a browser or proxy HTTP cache. Without this, a
        // cached GET could keep serving stale public content after a save.
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null;

/** Returns the client or throws a clear, non-secret error when unconfigured. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}
