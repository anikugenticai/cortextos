import { NextRequest } from 'next/server';
import { updateIntelItem } from '@/lib/data/intel';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };

  try {
    if (action === 'pin') {
      await updateIntelItem(id, { pinned: true });
    } else if (action === 'unpin') {
      await updateIntelItem(id, { pinned: false });
    } else if (action === 'dismiss') {
      await updateIntelItem(id, { status: 'dismissed' });
    } else if (action === 'done') {
      await updateIntelItem(id, { status: 'done' });
    } else if (action === 'undismiss' || action === 'undone') {
      await updateIntelItem(id, { status: 'active' });
    } else if (action === 'feedback_useful') {
      await updateIntelItem(id, { feedback: 'useful', feedback_at: new Date().toISOString() });
    } else if (action === 'feedback_not_useful') {
      await updateIntelItem(id, { feedback: 'not_useful', feedback_at: new Date().toISOString() });
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[api/intel/id]', err);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
