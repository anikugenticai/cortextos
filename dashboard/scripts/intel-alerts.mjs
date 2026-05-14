#!/usr/bin/env node
/**
 * Telegram alerts for immediate-urgency intel signals.
 * Queries intel_signals for unalerted rows, sends Telegram via cortextos bus,
 * and marks telegram_alerted_at. Deduplicates by incident_id (1 alert per hour).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node intel-alerts.mjs
 *   (or set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment)
 */

import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mzfmnefhwqubnofsxnfs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TELEGRAM_CHAT_ID = process.env.CTX_TELEGRAM_CHAT_ID ?? '1526317956';

if (!SERVICE_ROLE_KEY) {
  console.error('[intel-alerts] Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabasePatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`);
}

async function main() {
  const signals = await supabaseGet(
    'intel_signals?urgency=eq.immediate&status=eq.open&telegram_alerted_at=is.null&order=created_at.asc&limit=10' +
    '&select=id,signal_type,headline,why_now,suggested_action,entity_refs,incident_id,confidence'
  );

  if (!signals.length) {
    console.log('[intel-alerts] No unalerted immediate signals.');
    return;
  }

  console.log(`[intel-alerts] Found ${signals.length} unalerted signal(s).`);

  for (const sig of signals) {
    let shouldSend = true;

    if (sig.incident_id) {
      const recent = await supabaseGet(
        `intel_signals?incident_id=eq.${encodeURIComponent(sig.incident_id)}` +
        `&telegram_alerted_at=gt.${new Date(Date.now() - 3600000).toISOString()}` +
        `&id=neq.${sig.id}&limit=1&select=id`
      );
      if (recent.length > 0) {
        console.log(`[intel-alerts] Dedup: incident ${sig.incident_id} already alerted within 1hr, skipping send for ${sig.id}`);
        shouldSend = false;
      }
    }

    if (shouldSend) {
      const type = (sig.signal_type ?? 'alert').toUpperCase().replace(/_/g, ' ');
      const headline = sig.headline ?? 'Unknown signal';
      const whyNow = sig.why_now ?? '';
      const action = sig.suggested_action ?? '';

      let msg = `🚨 *${type}*\n${headline}`;
      if (whyNow) msg += `\n\nWhy now: ${whyNow}`;
      if (action) msg += `\nAction: ${action}`;

      if (msg.length > 300) msg = msg.slice(0, 297) + '...';

      try {
        execSync(`cortextos bus send-telegram ${TELEGRAM_CHAT_ID} "${msg.replace(/"/g, '\\"')}"`, {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 15000,
        });
        console.log(`[intel-alerts] Sent Telegram for signal ${sig.id}`);
      } catch (err) {
        console.error(`[intel-alerts] Telegram send failed for ${sig.id}:`, err.message);
      }
    }

    await supabasePatch(`intel_signals?id=eq.${sig.id}`, {
      telegram_alerted_at: new Date().toISOString(),
    });
    console.log(`[intel-alerts] Marked telegram_alerted_at for ${sig.id}`);
  }
}

main().catch(err => {
  console.error('[intel-alerts] Fatal:', err.message);
  process.exit(1);
});
