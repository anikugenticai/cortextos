// cortextOS Dashboard - NextAuth v5 configuration
// Credentials provider backed by Supabase users table (cloud) or env vars (Vercel fallback)

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const isVercel = !!process.env.VERCEL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    csrfToken: {
      name: 'authjs.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    callbackUrl: {
      name: 'authjs.callback-url',
      options: { sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    pkceCodeVerifier: {
      name: 'authjs.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    state: {
      name: 'authjs.state',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    nonce: {
      name: 'authjs.nonce',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const trustProxy = process.env.TRUST_PROXY === 'true';
        const headers = (request as Request | undefined)?.headers;
        const ip = trustProxy
          ? (headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0')
          : (headers?.get('x-real-ip') ?? headers?.get('cf-connecting-ip') ?? '0.0.0.0');

        try {
          const { checkRateLimit } = await import('./rate-limit');
          const { allowed } = await checkRateLimit(ip);
          if (!allowed) {
            throw new Error('Too many attempts. Please try again later.');
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('Too many')) throw e;
        }

        if (!credentials?.username || !credentials?.password) return null;

        // Vercel env-var fallback (no DB needed)
        if (isVercel && !process.env.SUPABASE_URL) {
          const envUser = process.env.ADMIN_USERNAME ?? 'admin';
          const envPass = process.env.ADMIN_PASSWORD;
          if (!envPass) return null;
          if (credentials.username !== envUser) return null;
          if (credentials.password !== envPass) return null;
          return { id: '1', name: envUser };
        }

        await seedAdminUser();

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', credentials.username as string)
          .maybeSingle();

        if (error || !user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        try {
          const { resetRateLimit } = await import('./rate-limit');
          await resetRateLimit(ip);
        } catch { /* best effort */ }

        return {
          id: String(user.id),
          name: user.username,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth: session }) {
      return !!session;
    },
  },
});

/** Seed admin user from env vars, or sync password if SYNC_ADMIN_PASSWORD=true */
export async function seedAdminUser(): Promise<void> {
  const { count, error: countErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (countErr) return;

  const userCount = count ?? 0;
  if (userCount > 0 && process.env.SYNC_ADMIN_PASSWORD !== 'true') {
    return;
  }

  const username = process.env.ADMIN_USERNAME ?? 'admin';

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required but not set.');
  }
  const KNOWN_DEFAULTS = ['cortextos', 'password', 'admin', 'changeme'];
  if (process.env.NODE_ENV === 'production' && KNOWN_DEFAULTS.includes(password)) {
    throw new Error('ADMIN_PASSWORD is a known default. Set a strong password in .env.local');
  }

  if (userCount > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('username', username)
      .maybeSingle();

    if (user) {
      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) {
        const hash = await bcrypt.hash(password, 12);
        await supabase
          .from('users')
          .update({ password_hash: hash })
          .eq('username', username);
        console.log(`[auth] Admin password updated from environment (SYNC_ADMIN_PASSWORD=true)`);
      }
    }
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await supabase
    .from('users')
    .insert({ username, password_hash: hash });

  console.log(`[auth] Seeded admin user: ${username}`);
}
