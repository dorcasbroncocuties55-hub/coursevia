-- ============================================================
-- SUPPORT CHAT SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS support_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  user_name   text,
  user_email  text,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  escalated   boolean DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('user','bot','agent')),
  text                text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_conv_idx ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON support_conversations(status);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own conversations
CREATE POLICY "Users insert own conversations" ON support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own conversations
CREATE POLICY "Users view own conversations" ON support_conversations
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all
CREATE POLICY "Admins view all conversations" ON support_conversations
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users insert messages" ON support_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users view messages" ON support_messages
  FOR SELECT USING (true);

SELECT 'Support chat migration applied successfully' AS result;
