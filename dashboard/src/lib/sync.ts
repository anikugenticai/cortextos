import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import {
  CTX_ROOT,
  getOrgs,
  getTaskDir,
  getApprovalDir,
  getEventsDir,
  getHeartbeatPath,
} from './config';

// ---------------------------------------------------------------------------
// Task sync
// ---------------------------------------------------------------------------

export async function syncTasks(org: string): Promise<number> {
  const taskDir = getTaskDir(org);
  if (!fs.existsSync(taskDir)) return 0;

  const files = fs.readdirSync(taskDir).filter((f) => f.endsWith('.json'));
  const rows: Record<string, unknown>[] = [];

  for (const file of files) {
    const filePath = path.join(taskDir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const task = JSON.parse(raw);
      rows.push({
        id: task.id ?? path.basename(file, '.json'),
        title: task.title ?? 'Untitled',
        description: task.description ?? null,
        status: task.status ?? 'pending',
        priority: task.priority ?? 'normal',
        assignee: task.assigned_to ?? task.assignee ?? null,
        org,
        project: task.project ?? null,
        needs_approval: task.needs_approval ?? false,
        created_at: task.created_at ?? new Date().toISOString(),
        updated_at: task.updated_at ?? null,
        completed_at: task.completed_at ?? null,
        notes: task.notes ?? null,
        source_file: filePath,
      });
    } catch (err) {
      console.error(`[sync] Failed to parse task ${file}:`, err);
    }
  }

  if (rows.length === 0) {
    await supabase.from('tasks').delete().eq('org', org);
    return 0;
  }

  const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
  if (error) console.error('[sync] Task upsert error:', error?.message ?? error);

  // Prune rows whose source files no longer exist
  const activePaths = rows.map((r) => r.source_file as string);
  await supabase
    .from('tasks')
    .delete()
    .eq('org', org)
    .not('source_file', 'in', `(${activePaths.map((p) => `"${p}"`).join(',')})`);

  return rows.length;
}

// ---------------------------------------------------------------------------
// Approval sync
// ---------------------------------------------------------------------------

export async function syncApprovals(org: string): Promise<number> {
  const approvalDir = getApprovalDir(org);
  const rows: Record<string, unknown>[] = [];

  for (const subdir of ['pending', 'resolved'] as const) {
    const dir = path.join(approvalDir, subdir);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const approval = JSON.parse(raw);
        rows.push({
          id: approval.id ?? path.basename(file, '.json'),
          title: approval.title ?? 'Untitled',
          category: approval.category ?? 'other',
          description: approval.description ?? null,
          status: subdir === 'pending' ? 'pending' : (approval.status ?? 'approved'),
          agent: approval.requesting_agent ?? approval.agent ?? 'unknown',
          org,
          created_at: approval.created_at ?? new Date().toISOString(),
          resolved_at: approval.resolved_at ?? null,
          resolved_by: approval.resolved_by ?? null,
          resolution_note: approval.resolution_note ?? null,
          source_file: filePath,
        });
      } catch (err) {
        console.error(`[sync] Failed to parse approval ${file}:`, err);
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('approvals').upsert(rows, { onConflict: 'id' });
    if (error) console.error('[sync] Approval upsert error:', error?.message ?? error);
  }

  return rows.length;
}

// ---------------------------------------------------------------------------
// Event sync (JSONL)
// ---------------------------------------------------------------------------

export async function syncEvents(org: string, agent: string): Promise<number> {
  const eventsDir = getEventsDir(org, agent);
  if (!fs.existsSync(eventsDir)) return 0;

  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.jsonl'));
  const rows: Record<string, unknown>[] = [];

  for (const file of files) {
    const filePath = path.join(eventsDir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim());

      for (let i = 0; i < lines.length; i++) {
        try {
          const event = JSON.parse(lines[i]);
          rows.push({
            id: event.id ?? `${agent}-${file}-${i}`,
            timestamp: event.timestamp ?? new Date().toISOString(),
            agent: event.agent ?? agent,
            org,
            type: event.category ?? event.type ?? 'action',
            category: event.category ?? null,
            severity: event.severity ?? 'info',
            data: event.metadata
              ? JSON.stringify(event.metadata)
              : event.data
                ? JSON.stringify(event.data)
                : null,
            message: event.event ?? event.message ?? null,
            source_file: filePath,
          });
        } catch {
          // skip malformed lines
        }
      }
    } catch (err) {
      console.error(`[sync] Failed to read events ${file}:`, err);
    }
  }

  if (rows.length > 0) {
    // Batch upsert in chunks of 500 to avoid payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('events').upsert(chunk, { onConflict: 'id' });
      if (error) console.error('[sync] Event upsert error:', error?.message ?? error);
    }
  }

  return rows.length;
}

// ---------------------------------------------------------------------------
// Heartbeat sync
// ---------------------------------------------------------------------------

export async function syncHeartbeat(agent: string): Promise<boolean> {
  const heartbeatPath = getHeartbeatPath(agent);
  if (!fs.existsSync(heartbeatPath)) return false;

  try {
    const raw = fs.readFileSync(heartbeatPath, 'utf-8');
    const hb = JSON.parse(raw);

    const { error } = await supabase.from('heartbeats').upsert(
      {
        agent,
        org: hb.org ?? '',
        status: hb.status ?? null,
        current_task: hb.current_task ?? null,
        mode: hb.mode ?? null,
        last_heartbeat: hb.last_heartbeat ?? hb.timestamp ?? null,
        loop_interval: hb.loop_interval ?? null,
        uptime_seconds: hb.uptime_seconds ?? null,
      },
      { onConflict: 'agent' },
    );
    if (error) console.error('[sync] Heartbeat upsert error:', error?.message ?? error);
    return true;
  } catch (err) {
    console.error(`[sync] Failed to sync heartbeat for ${agent}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Full sync
// ---------------------------------------------------------------------------

export interface SyncResult {
  tasks: number;
  approvals: number;
  events: number;
  heartbeats: number;
}

export async function syncAll(): Promise<SyncResult> {
  const results: SyncResult = { tasks: 0, approvals: 0, events: 0, heartbeats: 0 };

  const orgs = getOrgs();
  for (const org of orgs) {
    results.tasks += await syncTasks(org);
    results.approvals += await syncApprovals(org);

    const eventsBaseDir = path.join(CTX_ROOT, 'orgs', org, 'analytics', 'events');
    if (fs.existsSync(eventsBaseDir)) {
      const eventAgentDirs = fs
        .readdirSync(eventsBaseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const agent of eventAgentDirs) {
        results.events += await syncEvents(org, agent);
      }
    }
  }

  const stateDir = path.join(CTX_ROOT, 'state');
  if (fs.existsSync(stateDir)) {
    const agentDirs = fs
      .readdirSync(stateDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    for (const agentDir of agentDirs) {
      if (await syncHeartbeat(agentDir.name)) results.heartbeats++;
    }
  }

  // Backfill empty org in heartbeats from enabled-agents.json
  try {
    const enabledFile = path.join(CTX_ROOT, 'config', 'enabled-agents.json');
    if (fs.existsSync(enabledFile)) {
      const enabled = JSON.parse(fs.readFileSync(enabledFile, 'utf-8'));
      for (const [name, config] of Object.entries(enabled)) {
        const agentOrg = (config as Record<string, string>).org ?? '';
        if (agentOrg) {
          await supabase
            .from('heartbeats')
            .update({ org: agentOrg })
            .eq('agent', name)
            .or("org.is.null,org.eq.");
        }
      }
    }
  } catch {
    // best effort
  }

  console.log(`[sync] Full sync complete:`, results);
  return results;
}

// ---------------------------------------------------------------------------
// Lazy cost sync
// ---------------------------------------------------------------------------

const COST_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export async function syncCostsLazy(): Promise<void> {
  const now = Date.now();
  const lastCostSync = (globalThis as unknown as Record<string, number>).__lastCostSync ?? 0;
  if (now - lastCostSync > COST_SYNC_INTERVAL_MS) {
    try {
      const { syncCosts } = await import('./cost-parser');
      const costResult = await syncCosts();
      (globalThis as unknown as Record<string, number>).__lastCostSync = now;
      if (costResult.inserted > 0) {
        console.log(`[sync] Cost sync: ${costResult.scanned} scanned, ${costResult.inserted} inserted`);
      }
    } catch {
      // best effort
    }
  }
}

// ---------------------------------------------------------------------------
// Single-file sync
// ---------------------------------------------------------------------------

export async function syncFile(filePath: string): Promise<void> {
  if (filePath.includes('/tasks/') && filePath.endsWith('.json')) {
    const org = extractOrgFromPath(filePath);
    if (org) await syncTasks(org);
  } else if (filePath.includes('/approvals/') && filePath.endsWith('.json')) {
    const org = extractOrgFromPath(filePath);
    if (org) await syncApprovals(org);
  } else if (filePath.includes('/analytics/events/') && filePath.endsWith('.jsonl')) {
    const { org, agent } = extractOrgAndAgentFromEventPath(filePath);
    if (org && agent) await syncEvents(org, agent);
  } else if (filePath.includes('/state/') && filePath.endsWith('heartbeat.json')) {
    const agent = extractAgentFromStatePath(filePath);
    if (agent) await syncHeartbeat(agent);
  }
}

// ---------------------------------------------------------------------------
// Path extraction helpers
// ---------------------------------------------------------------------------

export function extractOrgFromPath(filePath: string): string | null {
  const match = filePath.match(/\/orgs\/([^/]+)\//);
  return match ? match[1] : null;
}

export function extractOrgAndAgentFromEventPath(
  filePath: string,
): { org: string | null; agent: string | null } {
  const match = filePath.match(/\/orgs\/([^/]+)\/analytics\/events\/([^/]+)\//);
  return { org: match?.[1] ?? null, agent: match?.[2] ?? null };
}

export function extractAgentFromStatePath(filePath: string): string | null {
  const match = filePath.match(/\/state\/([^/]+)\//);
  return match ? match[1] : null;
}
