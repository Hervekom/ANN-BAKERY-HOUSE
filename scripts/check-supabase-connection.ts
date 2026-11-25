/**
 * Safe Supabase connectivity check for ANN BAKERY HOUSE.
 *
 * Run with: npm run supabase:check
 *
 * Loads .env.local, builds the Supabase client from the configured URL and
 * Publishable key, then probes a public, side-effect-free Auth endpoint:
 *   GET /auth/v1/settings -> 200 with a valid key, 401 with an invalid one.
 *
 * It never prints the key, never writes anything, and never touches
 * application tables, auth state, reviews or the Express/SQLite backend.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath, quiet: true });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

async function main(): Promise<void> {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is missing in .env.local');
  }
  if (!supabaseKey) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is missing in .env.local');
  }

  // Build the client exactly like the frontend module does (public URL + Publishable key only).
  createClient(supabaseUrl, supabaseKey);

  console.log(`[supabase-check] Project: ${new URL(supabaseUrl).origin}`);

  const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: supabaseKey },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`the Publishable key was rejected by the project (HTTP ${res.status})`);
  }
  if (res.status >= 500) {
    throw new Error(`the project returned HTTP ${res.status}`);
  }
  if (res.status !== 200) {
    throw new Error(`unexpected response from /auth/v1/settings (HTTP ${res.status})`);
  }

  console.log('[supabase-check] OK  auth/v1/settings -> HTTP 200 (key accepted)');
  console.log('[supabase-check] SUCCESS: Supabase client can communicate with the configured project.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  console.error(`[supabase-check] FAIL: ${message}`);
  process.exitCode = 1;
});
