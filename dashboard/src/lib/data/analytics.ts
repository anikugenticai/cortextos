import { supabase } from '@/lib/supabase';
import type { AgentStat } from '@/components/analytics/agent-effectiveness';

export async function getTaskThroughput(
  days: number = 30,
  org?: string,
): Promise<Array<{ date: string; tasks: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    let query = supabase
      .from('tasks')
      .select('completed_at')
      .eq('status', 'completed')
      .gte('completed_at', sinceISO)
      .not('completed_at', 'is', null);

    if (org) query = query.eq('org', org);

    const { data, error } = await query;
    if (error) throw error;

    const dateMap = new Map<string, number>();
    for (const row of data ?? []) {
      const date = (row.completed_at as string).substring(0, 10);
      dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
    }

    return Array.from(dateMap.entries())
      .map(([date, tasks]) => ({ date, tasks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function getAgentEffectiveness(org?: string): Promise<AgentStat[]> {
  try {
    let taskQuery = supabase
      .from('tasks')
      .select('assignee, status')
      .not('assignee', 'is', null)
      .neq('assignee', '');

    if (org) taskQuery = taskQuery.eq('org', org);

    let errorQuery = supabase
      .from('events')
      .select('agent')
      .eq('type', 'error');

    if (org) errorQuery = errorQuery.eq('org', org);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    let trendQuery = supabase
      .from('tasks')
      .select('assignee, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgo.toISOString())
      .not('assignee', 'is', null)
      .neq('assignee', '');

    const [taskRes, errorRes, trendRes] = await Promise.all([
      taskQuery,
      errorQuery,
      trendQuery,
    ]);

    if (taskRes.error) throw taskRes.error;

    const agentStats = new Map<string, { total: number; completed: number }>();
    for (const row of taskRes.data ?? []) {
      const name = row.assignee as string;
      const stat = agentStats.get(name) ?? { total: 0, completed: 0 };
      stat.total++;
      if (row.status === 'completed') stat.completed++;
      agentStats.set(name, stat);
    }

    const errorMap = new Map<string, number>();
    for (const row of errorRes.data ?? []) {
      const name = row.agent as string;
      errorMap.set(name, (errorMap.get(name) ?? 0) + 1);
    }

    const trendMap = new Map<string, number[]>();
    for (const row of trendRes.data ?? []) {
      const name = row.assignee as string;
      if (!trendMap.has(name)) trendMap.set(name, new Array(7).fill(0));
      const dayDiff = Math.floor(
        (Date.now() - new Date(row.completed_at as string).getTime()) / (86400 * 1000),
      );
      const idx = 6 - Math.min(dayDiff, 6);
      trendMap.get(name)![idx]++;
    }

    return Array.from(agentStats.entries()).map(([name, stat]) => ({
      name,
      completionRate: stat.total > 0 ? (stat.completed / stat.total) * 100 : 0,
      errorCount: errorMap.get(name) ?? 0,
      tasksCompleted: stat.completed,
      recentTrend: trendMap.get(name) ?? [0, 0, 0, 0, 0, 0, 0],
    }));
  } catch {
    return [];
  }
}
