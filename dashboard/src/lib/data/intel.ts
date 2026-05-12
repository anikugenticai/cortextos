import { supabase } from '@/lib/supabase';

export type IntelCategory =
  | 'people_radar'
  | 'your_space'
  | 'people_intel'
  | 'dot_connector'
  | 'meeting_prep'
  | 'business_pulse';

export interface IntelItem {
  id: string;
  category: IntelCategory;
  sub_type: string | null;
  importance: number;
  urgency: number;
  title: string;
  why_now: string | null;
  why_it_matters: string | null;
  suggested_action: string | null;
  evidence: unknown;
  source: string | null;
  source_ref: string | null;
  status: string;
  pinned: boolean;
  created_at: string;
  score: number; // computed: importance * 0.6 + urgency * 0.4
}

export async function getIntelItems(options?: {
  category?: IntelCategory;
  status?: string;
}): Promise<IntelItem[]> {
  let query = supabase
    .from('sage_intel_items')
    .select('*')
    .eq('status', options?.status ?? 'active')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[intel] fetch error:', error.message);
    return [];
  }

  return (data ?? [])
    .map(row => ({
      ...row,
      score: (row.importance ?? 0.5) * 0.6 + (row.urgency ?? 0.5) * 0.4,
    }))
    .sort((a, b) => {
      // pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.score - a.score;
    });
}

export async function getIntelCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('sage_intel_items')
    .select('category')
    .eq('status', 'active');

  if (error) return {};

  const counts: Record<string, number> = { all: 0 };
  for (const row of data ?? []) {
    counts.all = (counts.all ?? 0) + 1;
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

export async function updateIntelItem(
  id: string,
  updates: { pinned?: boolean; status?: string },
): Promise<void> {
  const { error } = await supabase
    .from('sage_intel_items')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
