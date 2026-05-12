-- cortextOS Dashboard Supabase Schema
-- Run this against the Supabase project to create all required tables.

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  assignee text,
  org text NOT NULL DEFAULT '',
  project text,
  needs_approval boolean DEFAULT false,
  created_at text NOT NULL,
  updated_at text,
  completed_at text,
  notes text,
  source_file text
);

CREATE TABLE IF NOT EXISTS approvals (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  status text NOT NULL DEFAULT 'pending',
  agent text NOT NULL,
  org text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  resolved_at text,
  resolved_by text,
  resolution_note text,
  source_file text
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  timestamp text NOT NULL,
  agent text NOT NULL,
  org text NOT NULL DEFAULT '',
  type text NOT NULL,
  category text,
  severity text NOT NULL DEFAULT 'info',
  data text,
  message text,
  source_file text
);

CREATE TABLE IF NOT EXISTS heartbeats (
  agent text PRIMARY KEY,
  org text NOT NULL DEFAULT '',
  status text,
  current_task text,
  mode text,
  last_heartbeat text,
  loop_interval integer,
  uptime_seconds integer
);

CREATE TABLE IF NOT EXISTS cost_entries (
  id bigserial PRIMARY KEY,
  timestamp text NOT NULL,
  agent text NOT NULL,
  org text NOT NULL DEFAULT '',
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd double precision NOT NULL DEFAULT 0,
  source_file text
);

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  from_agent text NOT NULL,
  to_agent text NOT NULL,
  org text NOT NULL DEFAULT '',
  timestamp text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  source_file text
);

CREATE TABLE IF NOT EXISTS sync_meta (
  file_path text PRIMARY KEY,
  mtime double precision NOT NULL,
  last_synced text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at bigint NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);

CREATE INDEX IF NOT EXISTS idx_approvals_org ON approvals(org);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(agent);

CREATE INDEX IF NOT EXISTS idx_events_org ON events(org);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);

CREATE INDEX IF NOT EXISTS idx_cost_entries_timestamp ON cost_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_entries_agent ON cost_entries(agent);
CREATE INDEX IF NOT EXISTS idx_cost_entries_org ON cost_entries(org);
CREATE INDEX IF NOT EXISTS idx_cost_entries_dedup ON cost_entries(source_file, timestamp, model, agent);

CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_agent);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_agent);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
