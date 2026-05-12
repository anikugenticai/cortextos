#!/usr/bin/env node
/**
 * Standalone Supabase sync — no Next.js required.
 * Reads agent files from CTX_ROOT and upserts to Supabase.
 * Run as: node dashboard/scripts/sync-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const CTX_ROOT = process.env.CTX_ROOT;
const CTX_INSTANCE_ID = process.env.CTX_INSTANCE_ID ?? 'default';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CTX_ROOT) { console.error('[sync] CTX_ROOT not set'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('[sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function getOrgs() {
  const configPath = path.join(CTX_ROOT, 'config', 'enabled-agents.json');
  if (!fs.existsSync(configPath)) return [];
  const agents = readJson(configPath) ?? {};
  return [...new Set(Object.values(agents).map(a => a.org).filter(Boolean))];
}

async function upsert(table, rows, conflictCol = 'id') {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictCol });
  if (error) console.error(`[sync] ${table} upsert error:`, error.message ?? error);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

async function syncTasks(org) {
  const taskDir = path.join(CTX_ROOT, 'orgs', org, 'tasks', 'active');
  if (!fs.existsSync(taskDir)) return 0;
  const rows = [];
  for (const file of fs.readdirSync(taskDir).filter(f => f.endsWith('.json'))) {
    const task = readJson(path.join(taskDir, file));
    if (!task) continue;
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
      source_file: path.join(taskDir, file),
    });
  }
  await upsert('tasks', rows);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function syncEvents(org, agent) {
  const eventsDir = path.join(CTX_ROOT, 'orgs', org, 'analytics', 'events', agent);
  if (!fs.existsSync(eventsDir)) return 0;
  const rows = [];
  for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.jsonl'))) {
    const lines = fs.readFileSync(path.join(eventsDir, file), 'utf-8').trim().split('\n');
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        if (!ev.id) continue;
        rows.push({
          id: ev.id,
          timestamp: ev.timestamp ?? new Date().toISOString(),
          agent: ev.agent ?? agent,
          org: ev.org ?? org,
          category: ev.category ?? 'action',
          event_type: ev.event_type ?? ev.type ?? 'unknown',
          level: ev.level ?? 'info',
          message: ev.message ?? null,
          meta: ev.meta ?? null,
        });
      } catch { /* skip malformed */ }
    }
  }
  await upsert('events', rows);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Heartbeats
// ---------------------------------------------------------------------------

async function syncHeartbeats() {
  const stateDir = path.join(CTX_ROOT, 'state');
  if (!fs.existsSync(stateDir)) return 0;
  const rows = [];
  for (const entry of fs.readdirSync(stateDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const agent = entry.name;
    const hbPath = path.join(stateDir, agent, 'heartbeat.json');
    const hb = readJson(hbPath);
    if (!hb) continue;
    rows.push({
      agent,
      org: hb.org ?? '',
      status: hb.status ?? 'unknown',
      current_task: hb.current_task ?? null,
      last_heartbeat: hb.last_heartbeat ?? hb.timestamp ?? new Date().toISOString(),
      uptime_seconds: hb.uptime_seconds ?? null,
    });
  }
  if (rows.length) {
    const { error } = await supabase.from('heartbeats').upsert(rows, { onConflict: 'agent' });
    if (error) console.error('[sync] heartbeats upsert error:', error.message ?? error);
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const start = Date.now();
  const orgs = getOrgs();
  let tasks = 0, events = 0, heartbeats = 0;

  for (const org of orgs) {
    tasks += await syncTasks(org);
    const eventsBase = path.join(CTX_ROOT, 'orgs', org, 'analytics', 'events');
    if (fs.existsSync(eventsBase)) {
      for (const d of fs.readdirSync(eventsBase, { withFileTypes: true })) {
        if (d.isDirectory()) events += await syncEvents(org, d.name);
      }
    }
  }
  heartbeats = await syncHeartbeats();

  const ms = Date.now() - start;
  console.log(`[sync] done in ${ms}ms — tasks:${tasks} events:${events} heartbeats:${heartbeats}`);
}

main().catch(e => { console.error('[sync] fatal:', e.message); process.exit(1); });
