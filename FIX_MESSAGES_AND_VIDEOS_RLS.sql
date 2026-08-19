-- ── Fix 403 on messages table ─────────────────────────────────────────────────
-- The messages table has RLS enabled but no policy allowing users to read their
-- own messages, causing 403 Forbidden errors.

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'Users see own messages'
  ) THEN
    CREATE POLICY "Users see own messages" ON messages
      FOR ALL USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
      );
  END IF;
END $$;

-- ── Fix 400 on videos table ───────────────────────────────────────────────────
-- The videos table is missing RLS policies, causing 400 Bad Request errors
-- when the frontend queries it.

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'videos' AND policyname = 'Public can view published videos'
  ) THEN
    CREATE POLICY "Public can view published videos" ON videos
      FOR SELECT USING (status = 'published');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'videos' AND policyname = 'Creators manage own videos'
  ) THEN
    CREATE POLICY "Creators manage own videos" ON videos
      FOR ALL USING (auth.uid() = creator_id);
  END IF;

  -- Allow authenticated users to view any video (for learner access checks)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'videos' AND policyname = 'Authenticated users can view videos'
  ) THEN
    CREATE POLICY "Authenticated users can view videos" ON videos
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;
