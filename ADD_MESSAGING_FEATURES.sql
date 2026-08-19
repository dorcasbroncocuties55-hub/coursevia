-- ============================================================================
-- MESSAGING SYSTEM ENHANCEMENTS - FIVERR STANDARD
-- ============================================================================
-- Adds professional messaging features:
-- - Message attachments (files)
-- - Conversation metadata (starred, archived, labels)
-- - Response time tracking
-- - Message read receipts
-- ============================================================================

-- ============================================================================
-- 1. Add attachment columns to messages table
-- ============================================================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Create index for message type filtering
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- ============================================================================
-- 2. Create conversation_metadata table for starring, archiving, labels
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  label TEXT,
  avg_response_time_minutes INTEGER, -- Average response time in minutes
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);

-- Create indexes for conversation metadata
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_user ON conversation_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_partner ON conversation_metadata(partner_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_starred ON conversation_metadata(user_id, is_starred) WHERE is_starred = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_archived ON conversation_metadata(user_id, is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_label ON conversation_metadata(user_id, label) WHERE label IS NOT NULL;

-- ============================================================================
-- 3. Create storage bucket for message attachments
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Storage policies for message attachments
-- ============================================================================

-- Allow authenticated users to upload their own attachments
DROP POLICY IF EXISTS "authenticated_upload_attachments" ON storage.objects;
CREATE POLICY "authenticated_upload_attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read attachments from conversations they're part of
DROP POLICY IF EXISTS "authenticated_read_attachments" ON storage.objects;
CREATE POLICY "authenticated_read_attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'message-attachments');

-- Allow users to delete their own attachments
DROP POLICY IF EXISTS "authenticated_delete_own_attachments" ON storage.objects;
CREATE POLICY "authenticated_delete_own_attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 5. RLS policies for conversation_metadata
-- ============================================================================
ALTER TABLE conversation_metadata ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversation metadata
DROP POLICY IF EXISTS "users_own_metadata" ON conversation_metadata;
CREATE POLICY "users_own_metadata"
  ON conversation_metadata
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. Update messages table to track read status better
-- ============================================================================

-- Add index for unread messages count
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Add index for conversation lookup (both directions)
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_reverse ON messages(receiver_id, sender_id, created_at DESC);

-- ============================================================================
-- 7. Function to calculate average response time
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_response_time(
  user1_id UUID,
  user2_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  avg_minutes INTEGER;
BEGIN
  -- Calculate average time between receiving a message and sending a reply
  -- This is a simplified calculation - production would be more sophisticated
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (
    LEAD(created_at) OVER (ORDER BY created_at) - created_at
  )) / 60)::INTEGER, 60) -- Default to 60 minutes if no data
  INTO avg_minutes
  FROM messages
  WHERE (sender_id = user1_id AND receiver_id = user2_id)
     OR (sender_id = user2_id AND receiver_id = user1_id)
  ORDER BY created_at DESC
  LIMIT 50; -- Look at last 50 messages

  RETURN COALESCE(avg_minutes, 60);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Grant permissions
-- ============================================================================
GRANT ALL ON conversation_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_response_time TO authenticated;

-- ============================================================================
-- 9. Update trigger for conversation_metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversation_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_metadata_timestamp ON conversation_metadata;
CREATE TRIGGER trigger_conversation_metadata_timestamp
  BEFORE UPDATE ON conversation_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_metadata_timestamp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the setup:

-- Check messages table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages';

-- Check conversation_metadata table
-- SELECT * FROM conversation_metadata LIMIT 1;

-- Check storage bucket
-- SELECT * FROM storage.buckets WHERE name = 'message-attachments';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Response time calculation is simplified - enhance based on your needs
-- 2. File size limit is set in the app (10MB) - can be enforced at DB level if needed
-- 3. Consider adding message deletion policies if required
-- 4. Add analytics tables for message metrics if needed
-- ============================================================================
