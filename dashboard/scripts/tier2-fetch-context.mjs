#!/usr/bin/env node
/**
 * Tier 2 Context Assembler — fetches everything Sage needs to reason about a candidate.
 * Takes a tier1_queue ID as argument, outputs a self-contained JSON context package to stdout.
 *
 * Usage:
 *   node tier2-fetch-context.mjs <queue_id>
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mzfmnefhwqubnofsxnfs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? 'mzfmnefhwqubnofsxnfs';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';

if (!SERVICE_ROLE_KEY) {
  console.error('[tier2-ctx] Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function sqlQuery(sql) {
  if (!ACCESS_TOKEN) return [];
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
    console.error(`[tier2-ctx] SQL failed (${res.status}):`, text);
    return [];
  }
  return res.json();
}

async function main() {
  const queueId = process.argv[2];
  if (!queueId) {
    console.error('[tier2-ctx] Usage: node tier2-fetch-context.mjs <queue_id>');
    process.exit(1);
  }

  // 1. Fetch the tier1_queue row
  const queueRows = await restGet(`tier1_queue?id=eq.${queueId}&select=*`);
  if (!queueRows.length) {
    console.error(`[tier2-ctx] Queue item ${queueId} not found`);
    process.exit(1);
  }
  const candidate = queueRows[0];
  const eventIds = candidate.source_event_ids ?? [];

  if (!eventIds.length) {
    console.error(`[tier2-ctx] Queue item ${queueId} has no source_event_ids`);
    process.exit(1);
  }

  // 2. Fetch raw_events for all source_event_ids
  const events = await restGet(
    `raw_events?id=in.(${eventIds.join(',')})&select=id,source,timestamp,content_plain,actor,actor_type,channel_or_project,thread_id`
  );

  // Collect unique actors and channels for context lookups
  const actors = [...new Set(events.map(e => e.actor).filter(Boolean))];
  const channels = [...new Set(events.map(e => e.channel_or_project).filter(Boolean))];

  // 3. Fetch entity_traits for actors (if entities table has rows)
  let entityContext = [];
  if (actors.length > 0) {
    const actorList = actors.map(a => `'${a.replace(/'/g, "''")}'`).join(',');
    const entityRows = await sqlQuery(
      `SELECT e.id, e.canonical_name, e.type, e.entity_class, et.response_latency_avg, et.mention_frequency, et.sentiment_trend, et.task_completion_rate, et.min_data_points
       FROM entities e
       LEFT JOIN entity_traits et ON et.entity_id = e.id
       WHERE e.canonical_name IN (${actorList})
       LIMIT 20`
    );
    entityContext = entityRows;
  }

  // 4. Fetch up to 5 most recent intel_signals involving same channel or actor
  let priorSignals = [];
  if (channels.length > 0 || actors.length > 0) {
    const conditions = [];
    for (const ch of channels) {
      const escaped = ch.replace(/'/g, "''");
      conditions.push(`evidence_refs::text LIKE '%${escaped}%'`);
    }
    for (const actor of actors) {
      const escaped = actor.replace(/'/g, "''");
      conditions.push(`entity_refs::text LIKE '%${escaped}%'`);
    }

    if (conditions.length > 0) {
      const where = conditions.join(' OR ');
      priorSignals = await sqlQuery(
        `SELECT id, signal_type, headline, created_at, urgency, incident_id
         FROM intel_signals
         WHERE (${where})
         ORDER BY created_at DESC
         LIMIT 5`
      );
    }
  }

  // 5. Fetch up to 20 open incidents
  const openIncidents = await sqlQuery(
    `SELECT incident_id, headline, entity_refs, created_at
     FROM intel_signals
     WHERE status = 'open' AND incident_id IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 20`
  );

  // Assemble context package
  const context = {
    queue_id: candidate.id,
    candidate_type: candidate.candidate_type,
    urgency_hint: candidate.urgency_hint,
    reason: candidate.reason,
    events,
    prior_signals: priorSignals,
    open_incidents: openIncidents,
    entity_context: entityContext,
  };

  process.stdout.write(JSON.stringify(context, null, 2));
}

main().catch(err => {
  console.error('[tier2-ctx] fatal:', err.message);
  process.exit(1);
});
