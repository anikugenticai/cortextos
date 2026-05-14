import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignalEvidence } from '@/lib/data/intel-signals';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { data: signal, error } = await supabase
      .from('intel_signals')
      .select('evidence_refs')
      .eq('id', id)
      .single();

    if (error || !signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    const evidenceRefs = (signal.evidence_refs ?? []) as string[];
    const events = await getSignalEvidence(evidenceRefs);
    return Response.json({ events });
  } catch (err) {
    console.error('[api/intel/id/evidence]', err);
    return Response.json({ error: 'Failed to fetch evidence' }, { status: 500 });
  }
}
