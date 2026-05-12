import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1),
    500
  );
  const offset = Math.max(
    parseInt(searchParams.get('offset') ?? '0', 10) || 0,
    0
  );
  const type = searchParams.get('type');
  const agent = searchParams.get('agent');
  const org = searchParams.get('org');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    let query = supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (agent) query = query.eq('agent', agent);
    if (org) query = query.eq('org', org);
    if (from) query = query.gte('timestamp', from);
    if (to) query = query.lte('timestamp', to);

    const { data, error } = await query;
    if (error) throw error;

    const events = (data ?? []).map((row) => ({
      ...row,
      data: row.data ? JSON.parse(row.data as string) : null,
    }));

    return Response.json(events);
  } catch (err) {
    console.error('[api/events] Query error:', err);
    return Response.json({ error: 'Failed to query events' }, { status: 500 });
  }
}
