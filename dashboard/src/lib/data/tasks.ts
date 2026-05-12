import { supabase } from '@/lib/supabase';
import type { Task, TaskFilters } from '@/lib/types';

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.org) query = query.eq('org', filters.org);
    if (filters?.agent) {
      if (filters.agent === 'human') {
        query = query.or("assignee.in.(human,user),title.like.[HUMAN]%,project.eq.human-tasks");
      } else {
        query = query.eq('assignee', filters.agent);
      }
    }
    if (filters?.priority) query = query.eq('priority', filters.priority);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.project) query = query.eq('project', filters.project);
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToTask);
  } catch (err) {
    console.error('[data/tasks] getTasks error:', err);
    return [];
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTask(data) : null;
  } catch (err) {
    console.error('[data/tasks] getTaskById error:', err);
    return null;
  }
}

export async function getTasksByStatus(status: string, org?: string): Promise<Task[]> {
  return getTasks({ status, org });
}

export async function getTasksByAgent(agentName: string, org?: string): Promise<Task[]> {
  return getTasks({ agent: agentName, org });
}

export async function getTasksCompletedToday(org?: string): Promise<Task[]> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .gte('completed_at', todayISO)
      .order('completed_at', { ascending: false });

    if (org) query = query.eq('org', org);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToTask);
  } catch (err) {
    console.error('[data/tasks] getTasksCompletedToday error:', err);
    return [];
  }
}

export async function getInProgressCount(org?: string): Promise<number> {
  return getTaskCount(org, 'in_progress');
}

export async function getTaskCount(org?: string, status?: string): Promise<number> {
  try {
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    if (org) query = query.eq('org', org);
    if (status) query = query.eq('status', status);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.error('[data/tasks] getTaskCount error:', err);
    return 0;
  }
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assignee: (row.assignee as string) ?? undefined,
    org: row.org as string,
    project: (row.project as string) ?? undefined,
    needs_approval: row.needs_approval === true || row.needs_approval === 1,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? undefined,
    completed_at: (row.completed_at as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    source_file: (row.source_file as string) ?? undefined,
  };
}
