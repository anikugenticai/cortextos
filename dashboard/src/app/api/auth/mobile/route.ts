import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

const isVercel = !!process.env.VERCEL;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const ip = trustProxy
    ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
    : (request.headers.get('x-real-ip') ?? 'unknown');

  try {
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const { allowed, retryAfter } = await checkRateLimit(ip);
    if (!allowed) {
      return Response.json({ error: 'Too many attempts' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } } as any);
    }
  } catch { /* rate limit check is best effort */ }

  const JWT_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!JWT_SECRET) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 });
  }

  try {
    // Vercel env-var fallback when no Supabase configured
    if (isVercel && !process.env.SUPABASE_URL) {
      const envUser = process.env.ADMIN_USERNAME ?? 'admin';
      const envPass = process.env.ADMIN_PASSWORD;
      if (!envPass || username !== envUser || password !== envPass) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ sub: '1', name: envUser }, JWT_SECRET, { expiresIn: '30d' });
      return Response.json({ token, user: { id: '1', name: envUser } });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      await bcrypt.compare(password, '$2a$12$00000000000000000000000000000000000000000000000000000');
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    try {
      const { resetRateLimit } = await import('@/lib/rate-limit');
      await resetRateLimit(ip);
    } catch { /* best effort */ }

    const token = jwt.sign(
      { sub: String(user.id), name: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return Response.json({
      token,
      user: { id: String(user.id), name: user.username },
    });
  } catch (err) {
    console.error('[api/auth/mobile] Error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
