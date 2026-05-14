#!/usr/bin/env node
/**
 * Ingest raw events into Supabase raw_events table.
 * Reads JSON array from stdin or from a file path argument.
 * Uses Supabase REST API with service role key for bulk upserts.
 * Deduplication via UNIQUE(source, source_event_id) — duplicates are silently ignored.
 *
 * Usage:
 *   echo '[{...}]' | node ingest-raw-events.mjs
 *   node ingest-raw-events.mjs /path/to/events.json
 *   node ingest-raw-events.mjs --heartbeat slack
 */

import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mzfmnefhwqubnofsxnfs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SERVICE_ROLE_KEY) {
  console.error('[ingest] Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function stripSlackMrkdwn(text) {
  if (!text) return '';
  return text
    .replace(/<@[A-Z0-9]+>/g, '')           // @mentions
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1') // #channel references
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')   // <url|label> links
    .replace(/<([^>]+)>/g, '$1')             // bare <url> links
    .replace(/[*_~`]/g, '')                  // bold, italic, strikethrough, code
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripEmailHeaders(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const bodyStart = lines.findIndex((l, i) => i > 0 && l.trim() === '');
  const body = bodyStart > 0 ? lines.slice(bodyStart + 1).join('\n') : text;
  return body
    .replace(/^-{2,}\s*Original Message\s*-{2,}[\s\S]*$/im, '')
    .replace(/^On .+ wrote:[\s\S]*$/im, '')
    .replace(/^>{1,}.+$/gm, '')
    .replace(/--\s*\n[\s\S]*$/m, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateContentPlain(source, content) {
  switch (source) {
    case 'slack': return stripSlackMrkdwn(content);
    case 'email': return stripEmailHeaders(stripHtml(content));
    case 'asana': return stripHtml(content);
    case 'calendar': return (content ?? '').trim();
    default: return (content ?? '').trim();
  }
}

function validateEvent(evt) {
  if (!evt.source) return 'missing source';
  if (!evt.source_event_id) return 'missing source_event_id';
  if (!evt.timestamp) return 'missing timestamp';
  return null;
}

async function ingestEvents(events) {
  if (!events.length) {
    console.log('[ingest] 0 events, nothing to do');
    return;
  }

  const rows = events.map(evt => {
    const err = validateEvent(evt);
    if (err) {
      console.warn(`[ingest] skipping event: ${err}`, evt.source_event_id ?? 'unknown');
      return null;
    }
    return {
      source: evt.source,
      source_event_id: String(evt.source_event_id),
      timestamp: evt.timestamp,
      content: evt.content ?? null,
      content_plain: evt.content_plain ?? generateContentPlain(evt.source, evt.content),
      content_type: evt.content_type ?? 'text',
      machine_generated: evt.machine_generated ?? false,
      actor: evt.actor ?? null,
      actor_type: evt.actor_type ?? 'internal',
      channel_or_project: evt.channel_or_project ?? null,
      thread_id: evt.thread_id ?? null,
      parent_event_id: evt.parent_event_id ?? null,
      event_action: evt.event_action ?? 'create',
      metadata: evt.metadata ?? null,
    };
  }).filter(Boolean);

  if (!rows.length) {
    console.log('[ingest] all events skipped (validation failures)');
    return;
  }

  const batchSize = 100;
  let inserted = 0;
  const insertedIds = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/raw_events?on_conflict=source,source_event_id&select=id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[ingest] batch ${i}-${i + batch.length} failed (HTTP ${res.status}):`, errText);
    } else {
      const returned = await res.json();
      inserted += returned.length;
      for (const row of returned) {
        if (row.id) insertedIds.push(row.id);
      }
    }
  }

  console.error(`[ingest] done — ${inserted}/${events.length} events ingested (dupes silently ignored)`);
  return insertedIds;
}

async function emitHeartbeat(source) {
  const ts = Math.floor(Date.now() / 1000);
  const event = {
    source: 'system',
    source_event_id: `heartbeat-${source}-${ts}`,
    timestamp: new Date().toISOString(),
    content: 'heartbeat',
    content_plain: 'heartbeat',
    content_type: 'text',
    actor: 'system',
    actor_type: 'internal',
    channel_or_project: source,
    metadata: { monitor: source },
  };
  await ingestEvents([event]);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--heartbeat' && args[1]) {
    await emitHeartbeat(args[1]);
    return;
  }

  let input;
  if (args[0] && args[0] !== '-') {
    input = readFileSync(args[0], 'utf-8');
  } else {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    input = Buffer.concat(chunks).toString('utf-8');
  }

  let events;
  try {
    events = JSON.parse(input);
    if (!Array.isArray(events)) events = [events];
  } catch (e) {
    console.error('[ingest] invalid JSON input');
    process.exit(1);
  }

  const insertedIds = await ingestEvents(events);
  if (insertedIds && insertedIds.length > 0) {
    process.stdout.write(JSON.stringify(insertedIds));
  }
}

main().catch(err => {
  console.error('[ingest] fatal:', err.message);
  process.exit(1);
});
