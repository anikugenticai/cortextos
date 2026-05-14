-- Business Intelligence Architecture v2 — Phase 1: Database Schema
-- Creates 5 new tables: raw_events, entities, entity_traits, intel_signals, failed_candidates
-- Does NOT touch sage_intel_items (the old intel table stays until Phase 5 migrates the dashboard)
--
-- Partitioning note: Supabase free tier does not support native table partitioning.
-- Instead we use composite indexes on (source, timestamp) and (thread_id, timestamp)
-- for efficient time-range queries. When raw_events exceeds ~10M rows, partition by month
-- on the `timestamp` column and archive partitions older than 12 months.

-- ============================================================
-- Table 1: raw_events — permanent storage for all source events
-- ============================================================
CREATE TABLE IF NOT EXISTS raw_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  content TEXT,
  content_plain TEXT,
  content_type TEXT NOT NULL DEFAULT 'text',
  machine_generated BOOLEAN NOT NULL DEFAULT false,
  actor TEXT,
  actor_type TEXT NOT NULL DEFAULT 'internal',
  channel_or_project TEXT,
  thread_id TEXT,
  parent_event_id UUID REFERENCES raw_events(id),
  event_action TEXT NOT NULL DEFAULT 'create',
  metadata JSONB,
  UNIQUE(source, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_events_source_ts ON raw_events(source, timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_events_thread_ts ON raw_events(thread_id, timestamp) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_events_actor ON raw_events(actor, timestamp) WHERE actor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_events_channel ON raw_events(channel_or_project, timestamp) WHERE channel_or_project IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_events_parent ON raw_events(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_events_content_type ON raw_events(content_type) WHERE content_type != 'text';
CREATE INDEX IF NOT EXISTS idx_raw_events_machine ON raw_events(machine_generated) WHERE machine_generated = true;

-- ============================================================
-- Table 2: entities — persistent registry of people, projects, customers
-- ============================================================
CREATE TABLE IF NOT EXISTS entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('person', 'project', 'customer')),
  entity_class TEXT NOT NULL DEFAULT 'internal' CHECK (entity_class IN ('internal', 'external', 'system')),
  canonical_name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  disambiguation_key TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_class ON entities(entity_class);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_entities_disambiguation ON entities(disambiguation_key) WHERE disambiguation_key IS NOT NULL;

-- ============================================================
-- Table 3: entity_traits — rolling metrics per entity
-- One row per entity. Upserted on each computation run.
-- Using single-row-per-entity design because the trait set is fixed
-- (response_latency_avg, mention_frequency, sentiment_trend, task_completion_rate)
-- and this avoids N queries to assemble a trait summary for Tier 2 calls.
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_traits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  response_latency_avg FLOAT,
  mention_frequency FLOAT,
  sentiment_trend FLOAT,
  task_completion_rate FLOAT,
  min_data_points INT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_traits_entity ON entity_traits(entity_id);

-- ============================================================
-- Table 4: intel_signals — confirmed signals shown in dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS intel_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID,
  signal_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT,
  why_now TEXT,
  suggested_action TEXT,
  urgency TEXT NOT NULL DEFAULT 'fyi' CHECK (urgency IN ('immediate', 'today', 'this_week', 'fyi')),
  entity_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'done')),
  feedback TEXT CHECK (feedback IN ('useful', 'not_useful')),
  expires_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES intel_signals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_signals_status ON intel_signals(status);
CREATE INDEX IF NOT EXISTS idx_intel_signals_urgency ON intel_signals(urgency);
CREATE INDEX IF NOT EXISTS idx_intel_signals_incident ON intel_signals(incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intel_signals_type ON intel_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_intel_signals_created ON intel_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_signals_expires ON intel_signals(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intel_signals_open_feed ON intel_signals(status, urgency, created_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_intel_signals_superseded ON intel_signals(superseded_by) WHERE superseded_by IS NOT NULL;

-- ============================================================
-- Table 5: failed_candidates — dead letter queue for failed Tier 2 calls
-- Retry up to 3 times with exponential backoff. After 3 failures, log and move on.
-- ============================================================
CREATE TABLE IF NOT EXISTS failed_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_data JSONB NOT NULL,
  error_reason TEXT NOT NULL,
  last_error TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  source TEXT,
  source_event_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_failed_candidates_retry ON failed_candidates(next_retry_at)
  WHERE resolved_at IS NULL AND attempt_count < 3;
CREATE INDEX IF NOT EXISTS idx_failed_candidates_unresolved ON failed_candidates(created_at)
  WHERE resolved_at IS NULL;

-- ============================================================
-- Table 6: tier1_queue — candidate queue for Tier 1 detection output
-- Added in Phase 3. Tier 1 deterministic filters write candidates here;
-- Tier 2 LLM synthesis reads from here.
-- ============================================================
CREATE TABLE IF NOT EXISTS tier1_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_event_ids JSONB NOT NULL,
  candidate_type TEXT NOT NULL,
  urgency_hint TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_hint IN ('immediate', 'normal')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tier1_queue_pending ON tier1_queue(created_at)
  WHERE status = 'pending';

-- ============================================================
-- Phase 6: Telegram alert tracking column on intel_signals
-- Added to support immediate-urgency Telegram notifications
-- with per-incident dedup (1 alert per incident_id per hour).
-- ============================================================
ALTER TABLE intel_signals ADD COLUMN IF NOT EXISTS telegram_alerted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_intel_signals_unalerted ON intel_signals(created_at)
  WHERE urgency = 'immediate' AND telegram_alerted_at IS NULL AND status = 'open';
