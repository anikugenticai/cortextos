import { NextRequest } from 'next/server';
import { updateInboxItem } from '@/lib/data/inbox';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body as { action?: string };

  try {
    if (action === 'done') {
      await updateInboxItem(id, 'done');
    } else if (action === 'dismiss') {
      await updateInboxItem(id, 'dismissed');
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[api/inbox/id]', err);
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }
}
