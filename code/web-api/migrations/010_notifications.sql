-- =============================================================
-- Declay Store — Migration 010: in-app notifications
-- W-16: notifications for customers (order status) and admins (new orders).
-- W-17: low-stock alerts land here as admin notifications.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id             BIGSERIAL PRIMARY KEY,
  recipient_type VARCHAR(10) NOT NULL,          -- 'admin' | 'user'
  recipient_id   INT,                            -- null = broadcast to all admins
  type           VARCHAR(50) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  body           TEXT,
  link           VARCHAR(500),
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
