import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
    );
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const globalForSupabase = globalThis as unknown as {
  __supabase: SupabaseClient | undefined;
};

export const supabase: SupabaseClient =
  globalForSupabase.__supabase ?? createSupabaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__supabase = supabase;
}
