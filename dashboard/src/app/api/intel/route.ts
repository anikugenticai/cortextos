import { NextRequest } from 'next/server';
import { getIntelItems, getIntelCounts, type IntelCategory } from '@/lib/data/intel';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as IntelCategory | null;
  const action = searchParams.get('action') ?? 'items';

  try {
    if (action === 'counts') {
      const counts = await getIntelCounts();
      return Response.json({ counts });
    }

    const items = await getIntelItems({ category: category ?? undefined });
    return Response.json({ items });
  } catch (err) {
    console.error('[api/intel]', err);
    return Response.json({ error: 'Failed to fetch intel' }, { status: 500 });
  }
}
