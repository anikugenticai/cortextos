import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

interface DbUser {
  id: number;
  username: string;
  created_at: string;
}

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .order('id');
    if (error) throw error;
    return Response.json({ users: (data ?? []).map((r: DbUser) => ({ id: r.id, username: r.username, created_at: r.created_at })) });
  } catch (err) {
    console.error('[api/settings/users] GET error:', err);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const trimmed = (username ?? '').trim();
    if (!trimmed || trimmed.length < 3) return Response.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    if (!password || password.length < 12) return Response.json({ error: 'Password must be at least 12 characters' }, { status: 400 });

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', trimmed)
      .maybeSingle();
    if (existing) return Response.json({ error: 'Username already exists' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const { error } = await supabase
      .from('users')
      .insert({ username: trimmed, password_hash: hash });
    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/settings/users] POST error:', err);
    return Response.json({ error: 'Failed to add user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;
    if ((count ?? 0) <= 1) return Response.json({ error: 'Cannot delete the last user' }, { status: 400 });

    const { error, count: deleted } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw error;
    if (deleted === 0) return Response.json({ error: 'User not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (err) {
    console.error('[api/settings/users] DELETE error:', err);
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
