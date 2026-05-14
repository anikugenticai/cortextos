import { getIntelSignals } from '@/lib/data/intel-signals';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const signals = await getIntelSignals();
    return Response.json({ signals });
  } catch (err) {
    console.error('[api/intel]', err);
    return Response.json({ error: 'Failed to fetch intel signals' }, { status: 500 });
  }
}
