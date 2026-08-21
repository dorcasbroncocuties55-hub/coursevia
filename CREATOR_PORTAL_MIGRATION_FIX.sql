-- ============================================================================
-- CREATOR PORTAL SCHEMA - MIGRATION FIX
-- ============================================================================
-- This adds missing columns and objects to existing schema
-- Safe to run multiple times
-- ============================================================================

-- Add missing columns to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_video_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS meta_keywords TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requires_enrollment_approval BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_students INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS discussion_enabled BOOLEAN DEFAULT true;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add missing columns to course_sections table
ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0;

-- Add missing columns to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('video', 'article', 'quiz', 'assignment', 'live_session'));
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS requires_previous_completion BOOLEAN DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS average_completion_time_minutes INTEGER;

-- Add missing columns to course_enrollments table
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS completed_lessons INTEGER DEFAULT 0;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2);
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS access_until TIMESTAMPTZ;

-- Add missing columns to lesson_progress table
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS video_progress_seconds INTEGER DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 1;

-- Add missing columns to course_reviews table
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE SET NULL;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS creator_response TEXT;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS creator_response_at TIMESTAMPTZ;
ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- Add missing columns to course_messages table
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE course_messages ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

-- Update conversation_id for existing messages if NULL
UPDATE course_messages 
SET conversation_id = gen_random_uuid() 
WHERE conversation_id IS NULL;

-- Make conversation_id NOT NULL after populating
ALTER TABLE course_messages ALTER COLUMN conversation_id SET NOT NULL;

-- Rename 'message' to 'content' if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_messages' AND column_name = 'message') THEN
    ALTER TABLE course_messages RENAME COLUMN message TO content;
  END IF;
END $$;

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES course_messages(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES course_reviews(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Create course_analytics table if not exists
CREATE TABLE IF NOT EXISTS course_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  new_enrollments INTEGER DEFAULT 0,
  total_enrollments INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  average_progress_percentage DECIMAL(5,2) DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  average_time_per_student_minutes INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  refunds DECIMAL(10,2) DEFAULT 0,
  net_revenue DECIMAL(10,2) DEFAULT 0,
  new_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, date)
);

-- Create certificates table if not exists
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  certificate_url TEXT,
  completion_date DATE NOT NULL,
  final_score DECIMAL(5,2),
  verification_code TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id)
);

-- Create all indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_courses_creator_id ON courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_search ON courses USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sections_order ON course_sections(course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section_id ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_attachments ON lessons USING gin(attachments);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON course_enrollments(enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_status ON lesson_progress(status);

CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON course_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON course_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON course_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON course_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON course_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON course_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_course_id ON course_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON course_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON course_messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON course_messages USING gin(attachments);

CREATE INDEX IF NOT EXISTS idx_analytics_course_id ON course_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON course_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);

-- Create or replace functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_course_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses 
    SET total_enrollments = total_enrollments + 1,
        total_students = (SELECT COUNT(DISTINCT student_id) FROM course_enrollments WHERE course_id = NEW.course_id)
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses 
    SET total_enrollments = total_enrollments - 1,
        total_students = (SELECT COUNT(DISTINCT student_id) FROM course_enrollments WHERE course_id = OLD.course_id)
    WHERE id = OLD.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET average_rating = (SELECT AVG(rating) FROM course_reviews WHERE course_id = NEW.course_id AND is_approved = true),
      total_reviews = (SELECT COUNT(*) FROM course_reviews WHERE course_id = NEW.course_id AND is_approved = true)
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before recreating
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_course_sections_updated_at ON course_sections;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON course_enrollments;
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON course_reviews;
DROP TRIGGER IF EXISTS update_course_enrollment_stats_trigger ON course_enrollments;
DROP TRIGGER IF EXISTS update_course_rating_trigger ON course_reviews;

-- Create triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_sections_updated_at BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_enrollment_stats_trigger
AFTER INSERT OR DELETE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION update_course_enrollment_stats();

CREATE TRIGGER update_course_rating_trigger
AFTER INSERT OR UPDATE ON course_reviews
FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- Courses Policies
CREATE POLICY "Creators can manage their own courses" ON courses
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (status = 'published');

-- Course Sections Policies
CREATE POLICY "Creators can manage sections of their courses" ON course_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.creator_id = auth.uid())
  );

CREATE POLICY "Enrolled students can view course sections" ON course_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_sections.course_id 
      AND (
        courses.status = 'published'
        OR EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = courses.id AND course_enrollments.student_id = auth.uid())
      )
    )
  );

-- Lessons Policies
CREATE POLICY "Creators can manage lessons of their courses" ON lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.creator_id = auth.uid())
  );

CREATE POLICY "Enrolled students can view lessons" ON lessons
  FOR SELECT USING (
    is_preview = true
    OR EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = lessons.course_id AND course_enrollments.student_id = auth.uid() AND course_enrollments.status = 'active')
  );

-- Enrollments Policies
CREATE POLICY "Students can view their own enrollments" ON course_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Creators can view enrollments for their courses" ON course_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.creator_id = auth.uid())
  );

CREATE POLICY "Students can create enrollments" ON course_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Lesson Progress Policies
CREATE POLICY "Students can manage their own progress" ON lesson_progress
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Creators can view student progress for their courses" ON lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons 
      JOIN courses ON courses.id = lessons.course_id 
      WHERE lessons.id = lesson_progress.lesson_id AND courses.creator_id = auth.uid()
    )
  );

-- Reviews Policies
CREATE POLICY "Anyone can view approved reviews" ON course_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Students can create reviews for enrolled courses" ON course_reviews
  FOR INSERT WITH CHECK (
    student_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = course_reviews.course_id AND course_enrollments.student_id = auth.uid())
  );

CREATE POLICY "Students can update their own reviews" ON course_reviews
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Creators can respond to reviews" ON course_reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_reviews.course_id AND courses.creator_id = auth.uid())
  );

-- Messages Policies
CREATE POLICY "Users can view their own messages" ON course_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON course_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON course_messages
  FOR UPDATE USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Certificates Policies
CREATE POLICY "Students can view their own certificates" ON certificates
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Anyone can verify certificates" ON certificates
  FOR SELECT USING (true);

-- Analytics Policies
CREATE POLICY "Creators can view analytics for their courses" ON course_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_analytics.course_id AND courses.creator_id = auth.uid())
  );
