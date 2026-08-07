-- ============================================================
-- PADDLE_MIGRATION.sql
-- Run this in Supabase SQL Editor.
-- Creates the paddle_events table for idempotent webhook processing.
-- ============================================================

-- ── paddle_events ─────────────────────────────────────────────────────────────
-- Records every processed Paddle webhook event.
-- Used to prevent double-crediting if Paddle retries a webhook.

CREATE TABLE IF NOT EXISTS public.paddle_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_event_id  text        UNIQUE NOT NULL,   -- notification_id from Paddle
  event_type       text        NOT NULL,
  transaction_id   text,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  amount           numeric(12,2),
  currency         text,
  custom_data      jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paddle_events_user_id_idx
  ON public.paddle_events (user_id);

CREATE INDEX IF NOT EXISTS paddle_events_transaction_id_idx
  ON public.paddle_events (transaction_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.paddle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own paddle events" ON public.paddle_events;

-- Users can view their own events (useful for debugging in support panel)
CREATE POLICY "Users can view own paddle events"
  ON public.paddle_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (backend) has full access via service_role key — no policy needed.

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'PADDLE_MIGRATION applied successfully' AS result;
