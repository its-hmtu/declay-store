-- =============================================================
-- Declay Store — Migration 033: live chat (customer ↔ staff handoff)
--
-- Context: the AI chatbot already answers customers, but every question it
-- cannot handle was a dead end. This adds a human escalation path on top of the
-- SAME session, so the staff member inherits the conversation instead of asking
-- the customer to repeat themselves.
--
-- Design notes:
-- * `mode` is the session state machine: bot → waiting → live → closed.
--   'bot' is the default so every existing session keeps working untouched.
-- * Guests must be able to escalate (guest checkout is a MUST in the MVP), hence
--   guest_session_id + guest contact fields — a chat must not require an account.
-- * `chat_role_enum` gains 'staff' and 'system' so the transcript is honest about
--   who spoke. Those two values are added in the .js wrapper, NOT here:
--   PostgreSQL refuses ALTER TYPE ... ADD VALUE inside a multi-statement
--   transaction (same constraint 018_order_returns.js works around).
--
-- Naming follows this schema's hand-written convention (`chat_role_enum`,
-- `order_status_enum`), not Sequelize's `enum_<table>_<column>` default.
-- Safe to re-run.
-- =============================================================

-- ── Session state machine ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE chat_mode_enum AS ENUM ('bot', 'waiting', 'live', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS mode chat_mode_enum NOT NULL DEFAULT 'bot',
  -- Which staff member owns the conversation. NULL while waiting in the queue.
  ADD COLUMN IF NOT EXISTS assigned_admin_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
  -- Guests have no user_id; this ties the session to their browser session.
  ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64),
  -- Where to reply when nobody was online. Optional — never force it on the customer.
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS handoff_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  -- Drives the unread badge in the staff inbox without scanning chat_messages.
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_last_read_at TIMESTAMPTZ;

-- The inbox lists "waiting first, oldest first" — this is the query that runs
-- on every staff poll, so it gets a partial index.
CREATE INDEX IF NOT EXISTS idx_chat_sessions_queue
  ON chat_sessions(mode, handoff_requested_at)
  WHERE mode IN ('waiting', 'live');

CREATE INDEX IF NOT EXISTS idx_chat_sessions_assigned
  ON chat_sessions(assigned_admin_id)
  WHERE assigned_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_guest
  ON chat_sessions(guest_session_id)
  WHERE guest_session_id IS NOT NULL;

-- ── Message authorship ───────────────────────────────────────
-- The 'staff'/'system' enum values are added by the .js wrapper before this runs.
ALTER TABLE chat_messages
  -- Attribution for staff replies, so the transcript survives a staff departure.
  ADD COLUMN IF NOT EXISTS admin_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at);

-- Backfill: existing sessions were bot-only conversations that are over.
UPDATE chat_sessions
   SET last_message_at = updated_at
 WHERE last_message_at IS NULL;

COMMENT ON COLUMN chat_sessions.mode IS
  'bot = AI answering; waiting = customer asked for a human, unclaimed; live = staff assigned; closed = ended.';
COMMENT ON COLUMN chat_sessions.guest_session_id IS
  'Anonymous browser session id — lets a guest escalate to staff without an account (guest checkout parity).';
