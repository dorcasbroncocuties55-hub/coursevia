-- ============================================================================
-- COMPLETE CREATOR PORTAL MIGRATION
-- ============================================================================
-- Creates all tables from scratch - safe to run on empty or partial database
-- ============================================================================

-- ============================================================================
-- CREATE ALL TABLES
-- ============================================================================

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  category TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  thumbnail_url TEXT,
  preview_video_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_free BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  total_students INTEGER DEFAULT 0,
  total_enrollments INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  requires_enrollment_approval BOOLEAN DEFAULT false,
  max_students INTEGER,
  certificate_enabled BOOLEAN DEFAULT true,
  discussion_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT valid_price CHECK (price >= 0)
);

-- 2. COURSE SECTIONS TABLE
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content_type TEXT CHECK (content_type IN ('video', 'article', 'quiz', 'assignment', 'live_session')),
  content_url TEXT,
  video_duration_seconds INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  requires_previous_completion BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  total_views INTEGER DEFAULT 0,
  average_completion_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- 4. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_lessons INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  certificate_issued_at TIMESTAMPTZ,
  certificate_url TEXT,
  payment_id UUID,
  amount_paid DECIMAL(10,2),
  access_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 5. LESSON PROGRESS TABLE
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  video_progress_seconds INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- 6. COURSE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_approved BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  creator_response TEXT,
  creator_response_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 7. COURSE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS course_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COURSE ANALYTICS TABLE
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

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  message_id UUID REFERENCES course_messages(id) ON DELETE CASCADE,
  review_id UUID REFERENCES course_reviews(id) ON DELETE CASCADE,
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CERTIFICATES TABLE
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

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

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

-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

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
    SET total_enrollments = GREATEST(total_enrollments - 1, 0),
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
  SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM course_reviews WHERE course_id = NEW.course_id AND is_approved = true),
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

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_sections_updated_at ON course_sections;
CREATE TRIGGER update_course_sections_updated_at BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON course_enrollments;
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON course_reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_enrollment_stats_trigger ON course_enrollments;
CREATE TRIGGER update_course_enrollment_stats_trigger
AFTER INSERT OR DELETE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION update_course_enrollment_stats();

DROP TRIGGER IF EXISTS update_course_rating_trigger ON course_reviews;
CREATE TRIGGER update_course_rating_trigger
AFTER INSERT OR UPDATE ON course_reviews
FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

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

-- ============================================================================
-- CREATE RLS POLICIES (Drop all existing first)
-- ============================================================================

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
CREATE POLICY "Creators can manage sections" ON course_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.creator_id = auth.uid()));

CREATE POLICY "Students can view sections" ON course_sections
  FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.status = 'published'));

-- Lessons Policies
CREATE POLICY "Creators can manage lessons" ON lessons
  FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.creator_id = auth.uid()));

CREATE POLICY "Students can view lessons" ON lessons
  FOR SELECT USING (is_preview = true OR EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = lessons.course_id AND course_enrollments.student_id = auth.uid()));

-- Enrollments Policies
CREATE POLICY "Students view own enrollments" ON course_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Creators view course enrollments" ON course_enrollments
  FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.creator_id = auth.uid()));

CREATE POLICY "Students can enroll" ON course_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Lesson Progress Policies
CREATE POLICY "Students manage own progress" ON lesson_progress
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Creators view progress" ON lesson_progress
  FOR SELECT USING (EXISTS (SELECT 1 FROM lessons JOIN courses ON courses.id = lessons.course_id WHERE lessons.id = lesson_progress.lesson_id AND courses.creator_id = auth.uid()));

-- Reviews Policies
CREATE POLICY "View approved reviews" ON course_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Students create reviews" ON course_reviews
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update own reviews" ON course_reviews
  FOR UPDATE USING (student_id = auth.uid());

-- Messages Policies
CREATE POLICY "Users view own messages" ON course_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users send messages" ON course_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Certificates Policies
CREATE POLICY "Students view own certificates" ON certificates
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Anyone can verify certificates" ON certificates
  FOR SELECT USING (true);

-- Analytics Policies
CREATE POLICY "Creators view analytics" ON course_analytics
  FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_analytics.course_id AND courses.creator_id = auth.uid()));
