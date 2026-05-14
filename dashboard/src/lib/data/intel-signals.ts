import { supabase } from '@/lib/supabase';

export type SignalUrgency = 'immediate' | 'today' | 'this_week' | 'fyi';
export type SignalStatus = 'open' | 'dismissed' | 'done';
export type SignalFeedback = 'useful' | 'not_useful';
export type SignalType =
  | 'keyword_alert'
  | 'rate_spike'
  | 'state_diff'
  | 'bottleneck'
  | 'escalation'
  | 'contradiction'
  | 'kudos'
  | 'anomaly';

export interface IntelSignal {
  id: string;
  incident_id: string | null;
  signal_type: SignalType;
  headline: string;
  body: string | null;
  why_now: string | null;
  suggested_action: string | null;
  urgency: SignalUrgency;
  entity_refs: string[];
  evidence_refs: string[];
  confidence: number;
  status: SignalStatus;
  feedback: SignalFeedback | null;
  expires_at: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceEvent {
  id: string;
  source: string;
  timestamp: string;
  content_plain: string | null;
  actor: string | null;
  channel_or_project: string | null;
}

const URGENCY_ORDER: Record<SignalUrgency, number> = {
  immediate: 1,
  today: 2,
  this_week: 3,
  fyi: 4,
};

export async function getIntelSignals(): Promise<IntelSignal[]> {
  const { data, error } = await supabase
    .from('intel_signals')
    .select('*')
    .eq('status', 'open')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[intel-signals] fetch error:', error.message);
    return [];
  }

  const rows = (data ?? []) as IntelSignal[];
  return rows.sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency] ?? 4;
    const ub = URGENCY_ORDER[b.urgency] ?? 4;
    if (ua !== ub) return ua - ub;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function updateIntelSignal(
  id: string,
  updates: Partial<Pick<IntelSignal, 'status' | 'feedback'>>,
): Promise<void> {
  const { error } = await supabase
    .from('intel_signals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getSignalEvidence(evidenceRefs: string[]): Promise<EvidenceEvent[]> {
  if (!evidenceRefs.length) return [];
  const { data, error } = await supabase
    .from('raw_events')
    .select('id,source,timestamp,content_plain,actor,channel_or_project')
    .in('id', evidenceRefs)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[intel-signals] evidence fetch error:', error.message);
    return [];
  }
  return (data ?? []) as EvidenceEvent[];
}
