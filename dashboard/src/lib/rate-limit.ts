// Security (H8): Supabase-backed rate limiter — survives server restarts.
// Fails closed if db is unavailable (denying is safer than allowing unlimited attempts).
import { supabase } from '@/lib/supabase';

const MAX = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();

  try {
    // Prune expired entries opportunistically
    await supabase.from('rate_limits').delete().lte('reset_at', now);

    const { data, error } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('ip', ip)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      await supabase
        .from('rate_limits')
        .upsert({ ip, count: 1, reset_at: now + WINDOW_MS }, { onConflict: 'ip' });
      return { allowed: true };
    }

    if (data.count >= MAX) {
      return { allowed: false, retryAfter: Math.ceil((data.reset_at - now) / 1000) };
    }

    await supabase
      .from('rate_limits')
      .update({ count: data.count + 1 })
      .eq('ip', ip);
    return { allowed: true };
  } catch (err) {
    // Security (H8): Fail closed if DB is unavailable — denying is safer than allowing unlimited attempts.
    console.error('[rate-limit] DB error, failing closed (denying request):', err);
    return { allowed: false, retryAfter: 60 };
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  try {
    await supabase.from('rate_limits').delete().eq('ip', ip);
  } catch (err) {
    console.error('[rate-limit] DB error on reset:', err);
  }
}
