-- ============================================================
-- SUPPORT AGENT SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Support agents table
CREATE TABLE IF NOT EXISTS support_agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE,
  full_name   text,
  email       text,
  is_active   boolean DEFAULT true,
  is_online   boolean DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Support conversations
CREATE TABLE IF NOT EXISTS support_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  user_name     text,
  user_email    text,
  agent_id      uuid REFERENCES support_agents(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','resolved','closed')),
  subject       text,
  priority      text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  tags          text[],
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

-- 3. Support messages
CREATE TABLE IF NOT EXISTS support_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id         uuid,
  sender_name       text,
  role              text NOT NULL CHECK (role IN ('user','bot','agent')),
  text              text NOT NULL,
  read              boolean DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS support_conv_user_idx    ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conv_agent_idx   ON support_conversations(agent_id);
CREATE INDEX IF NOT EXISTS support_conv_status_idx  ON support_conversations(status);
CREATE INDEX IF NOT EXISTS support_msg_conv_idx     ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS support_msg_created_idx  ON support_messages(created_at DESC);

-- 5. Enable Realtime on messages (run in Supabase dashboard → Database → Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;

-- 6. RLS
ALTER TABLE support_agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages      ENABLE ROW LEVEL SECURITY;

-- Agents can manage themselves
DROP POLICY IF EXISTS "Agents manage own record" ON support_agents;
CREATE POLICY "Agents manage own record" ON support_agents
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can insert a conversation (guest or logged in)
DROP POLICY IF EXISTS "Anyone can create conversation" ON support_conversations;
CREATE POLICY "Anyone can create conversation" ON support_conversations
  FOR INSERT WITH CHECK (true);

-- Users see their own conversations; agents see all
DROP POLICY IF EXISTS "Users see own conversations" ON support_conversations;
CREATE POLICY "Users see own conversations" ON support_conversations
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM support_agents WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Agents can update conversations
DROP POLICY IF EXISTS "Agents update conversations" ON support_conversations;
CREATE POLICY "Agents update conversations" ON support_conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_agents WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Anyone can insert messages
DROP POLICY IF EXISTS "Anyone can send messages" ON support_messages;
CREATE POLICY "Anyone can send messages" ON support_messages
  FOR INSERT WITH CHECK (true);

-- Anyone can read messages (conversation-scoped in app logic)
DROP POLICY IF EXISTS "Anyone can read messages" ON support_messages;
CREATE POLICY "Anyone can read messages" ON support_messages
  FOR SELECT USING (true);

-- Agents can update messages (mark read)
DROP POLICY IF EXISTS "Agents update messages" ON support_messages;
CREATE POLICY "Agents update messages" ON support_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM support_agents WHERE user_id = auth.uid())
  );

SELECT 'Support agent migration applied successfully' AS result;
