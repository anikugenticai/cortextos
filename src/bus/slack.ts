/**
 * Slack integration for the cortextOS agent bus.
 *
 * Safety checks run automatically on every send:
 *  1. Block DM IDs (channels starting with 'D') — prevents accidental personal messages
 *  2. Enforce approved channel list (SLACK_ALLOWED_CHANNELS env var)
 *  3. Warn when message exceeds 2000 chars
 *  4. Caller logs the event; this module returns structured results
 */

export interface SendSlackResult {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
  blocked?: boolean;
  warnings: string[];
}

/**
 * Send a Slack message with built-in safety validation.
 *
 * @param channel        - Slack channel/group ID (e.g. C01ABC123)
 * @param text           - Message text
 * @param token          - Slack bot or user token (xoxb-* or xoxp-*)
 * @param allowedChannels - Approved channel IDs; empty array = no restriction
 * @param allowDm        - If true, DM IDs are not blocked (default: false)
 */
export async function sendSlack(
  channel: string,
  text: string,
  token: string,
  allowedChannels: string[],
  allowDm = false,
): Promise<SendSlackResult> {
  const warnings: string[] = [];

  // Safety check 1: block DM IDs unless explicitly permitted
  if (!allowDm && channel.startsWith('D')) {
    return {
      ok: false,
      blocked: true,
      error: `Blocked: '${channel}' looks like a Slack DM ID. Use a channel ID (starts with C) for agent messages. Set SLACK_ALLOW_DM=1 to override.`,
      warnings,
    };
  }

  // Safety check 2: approved channel list
  if (allowedChannels.length > 0 && !allowedChannels.includes(channel)) {
    return {
      ok: false,
      blocked: true,
      error: `Blocked: '${channel}' is not in SLACK_ALLOWED_CHANNELS. Approved: ${allowedChannels.join(', ')}. Add it to permit this channel.`,
      warnings,
    };
  }

  // Safety check 3: length warning (does not block — Slack API enforces its own limits)
  if (text.length > 2000) {
    warnings.push(`Message is ${text.length} chars; Slack recommends <2000. Consider splitting into multiple messages.`);
  }

  // Send via Slack Web API
  let data: any;
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text }),
    });
    data = await res.json();
  } catch (err: any) {
    return { ok: false, error: `Network error: ${err.message || err}`, warnings };
  }

  if (!data.ok) {
    return { ok: false, error: data.error ?? 'unknown_error', warnings };
  }

  return { ok: true, ts: data.ts, channel: data.channel, warnings };
}
