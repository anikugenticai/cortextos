/**
 * One-time setup: create sage_intel_items and sage_surface_actions tables in Supabase
 * and seed with sample data.
 * Run: npx tsx scripts/setup-intel-tables.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://mzfmnefhwqubnofsxnfs.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16Zm1uZWZod3F1Ym5vZnN4bmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1OTk3MCwiZXhwIjoyMDk0MTM1OTcwfQ.f-K3nsM8CVxKoKt6uty7ML_XxIOJL8kriCnb8AUfav8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Try to create tables via the Supabase REST SQL endpoint
async function runSQL(sql: string): Promise<void> {
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

  // Attempt via the Supabase management REST API
  const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sql',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: sql,
  });

  if (!res.ok) {
    // Fall back to trying supabase.rpc with common exec patterns
    try {
      const r1 = await (supabase as any).sql`${sql}`;
      if (r1.error) throw r1.error;
    } catch {
      console.error('Could not execute SQL via API. Run this SQL in the Supabase dashboard SQL editor:');
      console.log('\n--- SQL TO RUN ---');
      console.log(sql);
      console.log('--- END SQL ---\n');
    }
  } else {
    console.log('SQL executed successfully via API');
  }
}

const CREATE_INTEL_TABLE = `
CREATE TABLE IF NOT EXISTS sage_intel_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  sub_type TEXT,
  importance FLOAT NOT NULL DEFAULT 0.5,
  urgency FLOAT NOT NULL DEFAULT 0.5,
  title TEXT NOT NULL,
  why_now TEXT,
  why_it_matters TEXT,
  suggested_action TEXT,
  evidence JSONB,
  source TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sage_intel_category ON sage_intel_items(category);
CREATE INDEX IF NOT EXISTS idx_sage_intel_status ON sage_intel_items(status);
CREATE INDEX IF NOT EXISTS idx_sage_intel_pinned ON sage_intel_items(pinned);
`;

const CREATE_SURFACE_TABLE = `
CREATE TABLE IF NOT EXISTS sage_surface_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT,
  category TEXT NOT NULL DEFAULT 'all',
  urgency TEXT NOT NULL DEFAULT 'normal',
  summary TEXT NOT NULL,
  why TEXT,
  suggested_action TEXT,
  topic_keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sage_surface_status ON sage_surface_actions(status);
CREATE INDEX IF NOT EXISTS idx_sage_surface_urgency ON sage_surface_actions(urgency);
CREATE INDEX IF NOT EXISTS idx_sage_surface_created ON sage_surface_actions(created_at);
`;

const INTEL_SEED = [
  { category: 'people_radar', sub_type: 'team_change', importance: 0.85, urgency: 0.75, title: 'Marcus Rodriguez exploring other opportunities', why_now: 'LinkedIn activity spiked — 3 new connections at competing firms in 48h', why_it_matters: 'Marcus owns the Lurn email deliverability stack. Losing him mid-campaign season would cost ~$40k to replace.', suggested_action: 'Schedule 1:1 this week. Probe satisfaction. Consider retention package.', source: 'linkedin', status: 'active', pinned: false },
  { category: 'meeting_prep', sub_type: 'briefing', importance: 0.9, urgency: 0.95, title: 'ExpertScale board call — tomorrow 10am ET', why_now: 'Call is 18 hours away. Q2 deck not yet reviewed.', why_it_matters: 'David Chen will push on runway projections. Answer prepared = credibility. Answer missing = doubt.', suggested_action: 'Review Q2 deck tonight. Prepare 3 counterpoints on burn rate.', source: 'calendar', status: 'active', pinned: true },
  { category: 'business_pulse', sub_type: 'market_signal', importance: 0.7, urgency: 0.4, title: 'Competitor launched AI course builder — $49/month', why_now: 'ProductHunt launch today. Already 800+ upvotes.', why_it_matters: 'Direct overlap with Lurn\'s core positioning. Could affect new user conversion in the next 30 days.', suggested_action: 'Review their feature set. Brief product team. Consider accelerating Lurn AI module.', source: 'brain', status: 'active', pinned: false },
  { category: 'dot_connector', sub_type: 'pattern', importance: 0.8, urgency: 0.6, title: 'Three enterprise deals stalled after legal review', why_now: 'Pattern detected across Asana tasks from the last 14 days.', why_it_matters: 'All three deals share the same clause objection. One fix in your MSA template unblocks ~$180k ARR.', suggested_action: 'Ask legal to redline the data processing clause. Send to all three prospects.', source: 'asana', status: 'active', pinned: false },
  { category: 'your_space', sub_type: 'focus', importance: 0.6, urgency: 0.5, title: 'Deep work block available Thursday 2-5pm', why_now: 'Calendar cleared after Jason\'s reschedule.', why_it_matters: 'You\'ve been context-switching for 9 days straight. 3h uninterrupted = 2 major decisions cleared.', suggested_action: 'Block it for ExpertScale pricing model review. Decline any same-day adds.', source: 'calendar', status: 'active', pinned: false },
  { category: 'people_intel', sub_type: 'profile', importance: 0.75, urgency: 0.3, title: 'Sarah Kim (VC, Andreessen) — background brief', why_now: 'Meeting scheduled in 6 days.', why_it_matters: 'She led 4 EdTech deals. Known for founder-friendly terms but rigorous on unit economics.', suggested_action: 'Prepare LTV/CAC slides. Reference her portfolio company Teachable in your pitch narrative.', source: 'gmail', status: 'active', pinned: false },
  { category: 'people_radar', sub_type: 'relationship', importance: 0.65, urgency: 0.45, title: 'Ryan hasn\'t responded in 11 days — unusual pattern', why_now: 'Avg response time for Ryan is 2.3 days. Now at 11.', why_it_matters: 'Ryan manages $2.1M of Lurn affiliate revenue. Cold silence from a top affiliate = risk signal.', suggested_action: 'Send a personal check-in (not a business ask). Keep it warm.', source: 'gmail', status: 'active', pinned: false },
  { category: 'business_pulse', sub_type: 'financial', importance: 0.9, urgency: 0.7, title: 'Lurn ads CPL crept up 23% MoM — threshold crossed', why_now: 'Based on Meta Ads data pulled this morning. CPL now $14.80 avg.', why_it_matters: 'At $14.80 CPL and current conversion rates, paid acquisition is no longer profitable.', suggested_action: 'Pause bottom 3 campaigns immediately. Brief media buyer today.', source: 'brain', status: 'active', pinned: false },
];

const SURFACE_SEED = [
  { category: 'urgent', urgency: 'urgent', summary: 'Invoice #4821 from Stripe — $12,400 overdue 8 days', why: 'Stripe will suspend account in 72h if unpaid. Could affect Lurn checkout.', suggested_action: 'Approve payment from ops account', source: 'gmail', status: 'pending', topic_keywords: ['stripe', 'invoice', 'payment'] },
  { category: 'decision', urgency: 'urgent', summary: 'Approve ExpertScale Q2 budget — deadline Friday', why: 'Finance team is blocked on 3 hiring decisions until this is signed off.', suggested_action: 'Review budget doc and sign off', source: 'asana', status: 'pending', topic_keywords: ['budget', 'expertscale', 'hiring'] },
  { category: 'needs_attention', urgency: 'important', summary: 'Jason is asking about Q3 launch date — 3rd time this week', why: 'He\'s likely managing stakeholder expectations on his end.', suggested_action: 'Give him a soft date or a clear "TBD" so he stops escalating', source: 'slack', status: 'pending', topic_keywords: ['jason', 'launch', 'q3'] },
  { category: 'decision', urgency: 'important', summary: 'Accept or decline Forbes 30u30 nomination for team member', why: 'Nomination window closes in 4 days.', suggested_action: 'Nominate Marcus Rodriguez or respond to decline', source: 'gmail', status: 'pending', topic_keywords: ['forbes', 'nomination', 'marcus'] },
  { category: 'needs_attention', urgency: 'important', summary: 'Lurn support ticket volume up 40% — AI module bug suspected', why: 'Spike started after last Tuesday\'s deploy. Same error pattern across 80+ tickets.', suggested_action: 'Flag engineering for hotfix today', source: 'brain', status: 'pending', topic_keywords: ['lurn', 'support', 'bug', 'ai'] },
  { category: 'fyi', urgency: 'normal', summary: 'HubSpot usage report: team sent 0 follow-up sequences last month', why: 'Tool is paid and unused. Either train the team or cancel.', suggested_action: 'Forward to ops to decide keep/cancel by EOW', source: 'gmail', status: 'pending', topic_keywords: ['hubspot', 'crm', 'ops'] },
  { category: 'needs_attention', urgency: 'normal', summary: 'Slack workspace approaching 90-day message history limit (free plan)', why: 'Team communication history will be cut off in ~12 days.', suggested_action: 'Upgrade to Pro or export history before cutoff', source: 'slack', status: 'pending', topic_keywords: ['slack', 'upgrade', 'workspace'] },
  { category: 'fyi', urgency: 'normal', summary: 'Google Analytics report: Lurn organic traffic up 18% MoM', why: 'SEO changes from March are showing results.', suggested_action: 'Share with content team as positive signal', source: 'brain', status: 'pending', topic_keywords: ['seo', 'analytics', 'lurn', 'organic'] },
];

async function main() {
  console.log('Setting up Supabase tables...');

  // Try to create tables
  await runSQL(CREATE_INTEL_TABLE);
  await runSQL(CREATE_SURFACE_TABLE);

  // Seed intel items
  console.log('Seeding sage_intel_items...');
  const { error: intelError } = await supabase
    .from('sage_intel_items')
    .upsert(INTEL_SEED, { onConflict: 'id', ignoreDuplicates: true });

  if (intelError) {
    console.error('Intel seed error:', intelError.message);
    console.log('\nRun this SQL in the Supabase SQL editor:\n');
    console.log(CREATE_INTEL_TABLE);
    console.log(CREATE_SURFACE_TABLE);
  } else {
    console.log('sage_intel_items seeded.');
  }

  // Seed surface actions
  console.log('Seeding sage_surface_actions...');
  const { error: surfaceError } = await supabase
    .from('sage_surface_actions')
    .upsert(SURFACE_SEED, { onConflict: 'id', ignoreDuplicates: true });

  if (surfaceError) {
    console.error('Surface seed error:', surfaceError.message);
  } else {
    console.log('sage_surface_actions seeded.');
  }

  console.log('Done.');
}

main().catch(console.error);
