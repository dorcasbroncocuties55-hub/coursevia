-- ============================================================
-- MESSAGE OFFERS TABLE + messages table columns
-- Run this in Supabase SQL Editor BEFORE deploying the code
-- ============================================================

-- 1. Add message_type and offer_id columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES message_offers(id) ON DELETE SET NULL;

-- 2. Create message_offers table
CREATE TABLE IF NOT EXISTS message_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  receiver_id      uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  price            numeric(10,2) NOT NULL CHECK (price > 0),
  duration_minutes integer NOT NULL DEFAULT 60,
  scheduled_at     timestamptz,
  session_mode     text NOT NULL DEFAULT 'online' CHECK (session_mode IN ('online','in_person')),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 3. Re-run alter now that message_offers exists (if ran in order above, skip)
ALTER TABLE messages
  DROP COLUMN IF EXISTS offer_id;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES message_offers(id) ON DELETE SET NULL;

-- 4. Enable RLS on message_offers
ALTER TABLE message_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offer_select" ON message_offers;
DROP POLICY IF EXISTS "offer_insert" ON message_offers;
DROP POLICY IF EXISTS "offer_update" ON message_offers;

-- Sender and receiver can read their offers
CREATE POLICY "offer_select" ON message_offers
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Only coaches/therapists (senders) can create offers
CREATE POLICY "offer_insert" ON message_offers
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Receiver can update status (accept/decline); sender can update too
CREATE POLICY "offer_update" ON message_offers
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 5. Grants
GRANT SELECT, INSERT, UPDATE ON message_offers TO authenticated;

-- 6. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_message_offers_sender   ON message_offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_offers_receiver ON message_offers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_offer_id       ON messages(offer_id);

-- 7. Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'messages' AND column_name IN ('message_type','offer_id');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'message_offers' ORDER BY ordinal_position;
