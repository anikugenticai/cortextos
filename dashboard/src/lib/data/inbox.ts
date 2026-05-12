import { supabase } from '@/lib/supabase';

export type InboxUrgency = 'urgent' | 'important' | 'normal';
export type InboxCategory = 'all' | 'urgent' | 'needs_attention' | 'decision' | 'fyi';
export type InboxSource = 'gmail' | 'asana' | 'slack' | 'calendar' | 'brain';

export interface InboxItem {
  id: string;
  destination: string | null;
  category: InboxCategory;
  urgency: InboxUrgency;
  summary: string;
  why: string | null;
  suggested_action: string | null;
  topic_keywords: string[] | null;
  status: string;
  source: InboxSource | string | null;
  source_ref: string | null;
  created_at: string;
  is_stale: boolean; // computed: > 7 days old
}

const STALE_DAYS = 7;

export async function getInboxItems(options?: {
  category?: InboxCategory;
  since?: Date;
}): Promise<InboxItem[]> {
  let query = supabase
    .from('sage_surface_actions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category);
  }

  if (options?.since) {
    query = query.gte('created_at', options.since.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('[inbox] fetch error:', error.message);
    return [];
  }

  const now = Date.now();
  const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

  return (data ?? []).map(row => ({
    ...row,
    is_stale: now - new Date(row.created_at).getTime() > STALE_MS,
  }));
}

export async function getInboxCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('sage_surface_actions')
    .select('category, urgency')
    .eq('status', 'pending');

  if (error) return {};

  const counts: Record<string, number> = { all: 0, urgent: 0 };
  for (const row of data ?? []) {
    counts.all = (counts.all ?? 0) + 1;
    counts[row.category] = (counts[row.category] ?? 0) + 1;
    if (row.urgency === 'urgent') {
      counts.urgent = (counts.urgent ?? 0) + 1;
    }
  }
  return counts;
}

export async function updateInboxItem(
  id: string,
  status: 'done' | 'dismissed',
): Promise<void> {
  const { error } = await supabase
    .from('sage_surface_actions')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
