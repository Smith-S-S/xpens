import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client, creating it lazily on first call.
 * Returns null if env vars are missing (e.g. during SSR or guest mode).
 * Supabase's built-in auth is disabled — we use Clerk instead.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_client) {
    _client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}
