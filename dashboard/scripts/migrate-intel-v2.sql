-- Intel Feed Tab v2 migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mzfmnefhwqubnofsxnfs/sql

-- New columns
ALTER TABLE sage_intel_items ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('useful', 'not_useful'));
ALTER TABLE sage_intel_items ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
ALTER TABLE sage_intel_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Status constraint (safe: only valid values exist in seed data)
DO $$ BEGIN
  ALTER TABLE sage_intel_items ADD CONSTRAINT sage_intel_status_check CHECK (status IN ('active', 'dismissed', 'done'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Category constraint
DO $$ BEGIN
  ALTER TABLE sage_intel_items ADD CONSTRAINT sage_intel_category_check CHECK (category IN ('people_radar', 'your_space', 'people_intel', 'dot_connector', 'meeting_prep', 'business_pulse'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Keyset pagination index
CREATE INDEX IF NOT EXISTS idx_sage_intel_pagination ON sage_intel_items(status, pinned DESC, created_at DESC);

-- Dedup index for Sage writes
CREATE UNIQUE INDEX IF NOT EXISTS idx_sage_intel_dedup ON sage_intel_items(source, source_ref) WHERE source_ref IS NOT NULL AND status = 'active';
