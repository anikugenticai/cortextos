import { supabase } from '@/lib/supabase';
import type { Approval } from '@/lib/types';

export async function getPendingApprovals(org?: string): Promise<Approval[]> {
  return getApprovalsByStatus('pending', org);
}

export async function getResolvedApprovals(
  org?: string,
  filters?: { agent?: string; category?: string; dateRange?: [Date, Date] },
): Promise<Approval[]> {
  try {
    let query = supabase
      .from('approvals')
      .select('*')
      .neq('status', 'pending')
      .order('resolved_at', { ascending: false });

    if (org) query = query.eq('org', org);
    if (filters?.agent) query = query.eq('agent', filters.agent);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.dateRange) {
      query = query
        .gte('resolved_at', filters.dateRange[0].toISOString())
        .lte('resolved_at', filters.dateRange[1].toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToApproval);
  } catch (err) {
    console.error('[data/approvals] getResolvedApprovals error:', err);
    return [];
  }
}

export async function getPendingCount(org?: string): Promise<number> {
  try {
    let query = supabase
      .from('approvals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (org) query = query.eq('org', org);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.error('[data/approvals] getPendingCount error:', err);
    return 0;
  }
}

export async function getApprovalById(id: string): Promise<Approval | null> {
  try {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToApproval(data) : null;
  } catch (err) {
    console.error('[data/approvals] getApprovalById error:', err);
    return null;
  }
}

async function getApprovalsByStatus(status: string, org?: string): Promise<Approval[]> {
  try {
    let query = supabase
      .from('approvals')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (org) query = query.eq('org', org);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToApproval);
  } catch (err) {
    console.error('[data/approvals] getApprovalsByStatus error:', err);
    return [];
  }
}

function rowToApproval(row: Record<string, unknown>): Approval {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as Approval['category'],
    description: (row.description as string) ?? undefined,
    status: row.status as Approval['status'],
    agent: row.agent as string,
    org: row.org as string,
    created_at: row.created_at as string,
    resolved_at: (row.resolved_at as string) ?? undefined,
    resolved_by: (row.resolved_by as string) ?? undefined,
    resolution_note: (row.resolution_note as string) ?? undefined,
    source_file: (row.source_file as string) ?? undefined,
  };
}
