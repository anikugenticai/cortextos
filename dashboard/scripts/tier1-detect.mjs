#!/usr/bin/env node
/**
 * Tier 1 Deterministic Detection — runs on newly ingested raw_event IDs.
 * Checks: keyword matching, rate spike, state diff.
 * Outputs candidates to tier1_queue via Supabase REST API.
 *
 * Usage:
 *   echo '["uuid1","uuid2"]' | node tier1-detect.mjs
 *   node tier1-detect.mjs /path/to/ids.json
 */

import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mzfmnefhwqubnofsxnfs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? 'mzfmnefhwqubnofsxnfs';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';

if (!SERVICE_ROLE_KEY) {
  console.error('[tier1] Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const HIGH_URGENCY_KEYWORDS = [
  'down', 'outage', 'not working', 'broken', 'security',
  'data loss', 'breach', 'urgent',
];

const NORMAL_KEYWORDS = [
  'refund', 'chargeback', 'cancel', 'overdue', 'confused',
  'frustrated', 'annoyed', 'escalate', 'help', 'bug',
  'complaint', 'angry', 'unhappy', 'disappointed', 'late',
  'missed', 'wrong', 'error', 'fail',
];

const ANGRY_EMOJI_PATTERN = /[\u{1F624}\u{1F620}\u{1F621}\u{1F92C}]{3,}/u;

const STATE_DIFF_KEYWORDS = ['overdue', 'past due', 'missed deadline'];

async function supabaseRest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok && opts.method !== 'POST') {
    const text = await res.text();
    throw new Error(`REST ${path} failed (${res.status}): ${text}`);
  }
  return res;
}

async function supabaseQuery(sql) {
  if (!ACCESS_TOKEN) {
    console.warn('[tier1] No SUPABASE_ACCESS_TOKEN, skipping SQL query');
    return [];
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[tier1] SQL query failed (${res.status}):`, text);
    return [];
  }
  return res.json();
}

async function fetchEventsByIds(ids) {
  if (!ids.length) return [];
  const res = await supabaseRest(
    `raw_events?id=in.(${ids.join(',')})&select=id,source,source_event_id,timestamp,content_plain,actor,actor_type,channel_or_project,event_action,metadata`,
    { method: 'GET' }
  );
  return res.json();
}

function matchKeywords(text) {
  if (!text) return { high: [], normal: [] };
  const lower = text.toLowerCase();
  const high = HIGH_URGENCY_KEYWORDS.filter(kw => lower.includes(kw));
  const normal = NORMAL_KEYWORDS.filter(kw => lower.includes(kw));
  if (ANGRY_EMOJI_PATTERN.test(text)) {
    normal.push('angry_emoji_sequence');
  }
  return { high, normal };
}

function checkStateDiff(event) {
  if (event.source !== 'asana') return null;
  const lower = (event.content_plain ?? '').toLowerCase();
  for (const kw of STATE_DIFF_KEYWORDS) {
    if (lower.includes(kw)) {
      return kw;
    }
  }
  return null;
}

async function checkRateSpike(channelHits) {
  const spikes = [];

  for (const [channel, eventIds] of Object.entries(channelHits)) {
    if (eventIds.length < 3) continue;

    const escapedChannel = channel.replace(/'/g, "''");
    const rows = await supabaseQuery(
      `SELECT COUNT(*) as cnt, MIN(timestamp) as earliest FROM raw_events WHERE channel_or_project = '${escapedChannel}' AND source = 'slack' AND timestamp > NOW() - INTERVAL '7 days'`
    );

    if (!rows.length) continue;
    const totalWeek = parseInt(rows[0].cnt ?? '0', 10);
    const earliest = rows[0].earliest;

    if (!earliest) continue;
    const daysOfData = (Date.now() - new Date(earliest).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOfData < 7) {
      console.log(`[tier1] rate spike: skipping ${channel} — only ${daysOfData.toFixed(1)} days of data (cold-start)`);
      continue;
    }

    const dailyAvg = totalWeek / 7;
    const batchRate = eventIds.length;

    if (dailyAvg > 0 && batchRate >= dailyAvg * 2) {
      spikes.push({
        source_event_ids: eventIds,
        candidate_type: 'rate_spike',
        urgency_hint: 'normal',
        reason: `rate_spike: ${batchRate} matches vs ${dailyAvg.toFixed(1)}/day avg in ${channel}`,
      });
    }
  }

  return spikes;
}

async function writeCandidates(candidates) {
  if (!candidates.length) return;

  const res = await supabaseRest('tier1_queue', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(candidates),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[tier1] failed to write candidates (${res.status}):`, text);
  }
}

async function main() {
  const args = process.argv.slice(2);

  let input;
  if (args[0] && args[0] !== '-') {
    input = readFileSync(args[0], 'utf-8');
  } else {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    input = Buffer.concat(chunks).toString('utf-8');
  }

  let eventIds;
  try {
    eventIds = JSON.parse(input);
    if (!Array.isArray(eventIds)) eventIds = [eventIds];
  } catch {
    console.error('[tier1] invalid JSON input');
    process.exit(1);
  }

  if (!eventIds.length) {
    console.log('[tier1] 0 event IDs, nothing to detect');
    return;
  }

  const events = await fetchEventsByIds(eventIds);
  if (!events.length) {
    console.log('[tier1] 0 events found for given IDs');
    return;
  }

  // Skip system heartbeat events
  const realEvents = events.filter(e => e.source !== 'system');

  const immediateCandidates = [];
  const normalCandidates = [];
  const channelKeywordHits = {};

  for (const event of realEvents) {
    // A) Keyword matching
    const { high, normal } = matchKeywords(event.content_plain);

    if (high.length > 0) {
      immediateCandidates.push({
        source_event_ids: [event.id],
        candidate_type: 'keyword_hit',
        urgency_hint: 'immediate',
        reason: `keyword: ${high.join(', ')}`,
      });
    }

    if (normal.length > 0) {
      normalCandidates.push({
        source_event_ids: [event.id],
        candidate_type: 'keyword_hit',
        urgency_hint: 'normal',
        reason: `keyword: ${normal.join(', ')}`,
      });
    }

    // Track channel hits for rate spike check
    if ((high.length > 0 || normal.length > 0) && event.channel_or_project) {
      if (!channelKeywordHits[event.channel_or_project]) {
        channelKeywordHits[event.channel_or_project] = [];
      }
      channelKeywordHits[event.channel_or_project].push(event.id);
    }

    // C) State diff (Asana only)
    const stateDiffKw = checkStateDiff(event);
    if (stateDiffKw) {
      normalCandidates.push({
        source_event_ids: [event.id],
        candidate_type: 'state_diff',
        urgency_hint: 'normal',
        reason: `state_diff: ${stateDiffKw}`,
      });
    }
  }

  // B) Rate spike check
  const spikeCandidates = await checkRateSpike(channelKeywordHits);

  // D) Rate limiting — immediate always pass, normal capped at 50
  let queuedNormal = [...normalCandidates, ...spikeCandidates];
  if (queuedNormal.length > 50) {
    console.warn(`[tier1] rate limit hit: ${queuedNormal.length} normal candidates generated, queuing 50`);
    queuedNormal = queuedNormal.slice(0, 50);
  }

  const allCandidates = [...immediateCandidates, ...queuedNormal];

  if (allCandidates.length > 0) {
    await writeCandidates(allCandidates);
  }

  console.log(`[tier1] done — ${realEvents.length} events checked, ${allCandidates.length} candidates (${immediateCandidates.length} immediate, ${queuedNormal.length} normal)`);
}

main().catch(err => {
  console.error('[tier1] fatal:', err.message);
  process.exit(1);
});
