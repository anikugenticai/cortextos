import { NextRequest } from 'next/server';
import { updateIntelSignal } from '@/lib/data/intel-signals';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };

  try {
    if (action === 'dismiss') {
      await updateIntelSignal(id, { status: 'dismissed' });
    } else if (action === 'done') {
      await updateIntelSignal(id, { status: 'done' });
    } else if (action === 'feedback_useful') {
      await updateIntelSignal(id, { feedback: 'useful' });
    } else if (action === 'feedback_not_useful') {
      await updateIntelSignal(id, { feedback: 'not_useful' });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[api/intel/id]', err);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
