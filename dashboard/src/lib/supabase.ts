import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

// Always create a fresh client — do NOT use a globalThis singleton.
// The singleton pattern causes "TypeError: fetch failed" in Next.js dev mode
// because the cached client holds a stale fetch reference after hot reloads.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    // Bypass Next.js fetch interceptor — use the native undici fetch directly
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  },
});
