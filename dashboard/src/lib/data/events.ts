import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

export async function getRecentEvents(
  limit: number = 50,
  org?: string,
  agent?: string,
  category?: string,
): Promise<Event[]> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (org) query = query.eq('org', org);
    if (agent) query = query.eq('agent', agent);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToEvent);
  } catch (err) {
    console.error('[data/events] getRecentEvents error:', err);
    return [];
  }
}

export async function getEventsToday(org?: string, agent?: string): Promise<Event[]> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  try {
    let query = supabase
      .from('events')
      .select('*')
      .gte('timestamp', todayISO)
      .order('timestamp', { ascending: false });

    if (org) query = query.eq('org', org);
    if (agent) query = query.eq('agent', agent);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToEvent);
  } catch (err) {
    console.error('[data/events] getEventsToday error:', err);
    return [];
  }
}

export async function getEventsByAgent(agentName: string, limit: number = 50): Promise<Event[]> {
  return getRecentEvents(limit, undefined, agentName);
}

export async function getEventsByCategory(category: string, org?: string): Promise<Event[]> {
  return getRecentEvents(100, org, undefined, category);
}

export async function getMilestones(org?: string): Promise<Event[]> {
  return getRecentEvents(100, org, undefined, 'milestone');
}

function rowToEvent(row: Record<string, unknown>): Event {
  let parsedData: Record<string, unknown> | undefined;
  if (row.data) {
    try {
      parsedData = JSON.parse(row.data as string);
    } catch {
      parsedData = undefined;
    }
  }

  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    agent: row.agent as string,
    org: row.org as string,
    type: row.type as Event['type'],
    category: (row.category as string) ?? '',
    severity: row.severity as Event['severity'],
    data: parsedData,
    message: (row.message as string) ?? undefined,
    source_file: (row.source_file as string) ?? undefined,
  };
}
