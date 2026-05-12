import { NextRequest } from 'next/server';
import { getInboxItems, getInboxCounts, type InboxCategory } from '@/lib/data/inbox';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') ?? 'all') as InboxCategory;
  const action = searchParams.get('action') ?? 'items';
  const last30 = searchParams.get('last30') === 'true';

  try {
    if (action === 'counts') {
      const counts = await getInboxCounts();
      return Response.json({ counts });
    }

    const since = last30 ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : undefined;
    const items = await getInboxItems({ category, since });
    return Response.json({ items });
  } catch (err) {
    console.error('[api/inbox]', err);
    return Response.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}
