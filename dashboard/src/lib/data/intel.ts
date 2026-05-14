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
  feedback: 'useful' | 'not_useful' | null;
  feedback_at: string | null;
  updated_at: string | null;
  score: number; // computed: importance * 0.6 + urgency * 0.4
}

export interface IntelPage {
  items: IntelItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export async function getIntelItems(options?: {
  category?: IntelCategory;
  status?: string;
  limit?: number;
  after?: string;
}): Promise<IntelPage> {
  const limit = options?.limit ?? 15;
  const status = options?.status ?? 'active';

  // Count total active items matching filters
  let countQuery = supabase
    .from('sage_intel_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  if (options?.category) countQuery = countQuery.eq('category', options.category);
  const { count: total } = await countQuery;

  // Build paginated query
  let query = supabase
    .from('sage_intel_items')
    .select('*')
    .eq('status', status)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.after) {
    // Keyset pagination: only non-pinned items older than cursor
    query = query.eq('pinned', false).lt('created_at', options.after);
  }

  // Fetch one extra to detect hasMore
  query = query.limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error('[intel] fetch error:', error.message);
    return { items: [], total: total ?? 0, hasMore: false, nextCursor: null };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items = page
    .map(row => ({
      ...row,
      score: (row.importance ?? 0.5) * 0.6 + (row.urgency ?? 0.5) * 0.4,
    }))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.score - a.score;
    });

  const lastNonPinned = [...items].reverse().find(i => !i.pinned);
  const nextCursor = hasMore && lastNonPinned ? lastNonPinned.created_at : null;

  return { items, total: total ?? 0, hasMore, nextCursor };
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
  updates: {
    pinned?: boolean;
    status?: string;
    feedback?: 'useful' | 'not_useful';
    feedback_at?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('sage_intel_items')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
