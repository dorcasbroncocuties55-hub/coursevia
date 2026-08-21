-- ============================================================================
-- FINAL CREATOR PORTAL MIGRATION
-- ============================================================================
-- Creates missing tables and fixes existing ones
-- Safe to run - checks for existing objects
-- ============================================================================

-- Fix courses table - add missing columns that might not be there
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_enrollments INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

-- Create course_sections table if not exists
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

-- Create lessons table if not exists
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

-- Create course_enrollments table if not exists
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

-- Create lesson_progress table if not exists
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

-- Create course_reviews table if not exists
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

-- Create course_messages table if not exists
CREATE TABLE IF NOT EXISTS course_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
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
  certificate_number TEXT UNIQUE NOT NULL DEFAULT ('CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))),
  certificate_url TEXT,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  final_score DECIMAL(5,2),
  verification_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12)),
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id)
);

-- Create all indexes (only after tables exist)
DO $$ 
BEGIN
  -- Courses indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    CREATE INDEX IF NOT EXISTS idx_courses_creator_id ON courses(creator_id);
    CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
    CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
    CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
    CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
  END IF;

  -- Course sections indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_sections') THEN
    CREATE INDEX IF NOT EXISTS idx_course_sections_course_id ON course_sections(course_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='course_sections' AND column_name='order_index') THEN
      CREATE INDEX IF NOT EXISTS idx_course_sections_order ON course_sections(course_id, order_index);
    END IF;
  END IF;

  -- Lessons indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons') THEN
    CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_section_id ON lessons(section_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='order_index') THEN
      CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
    END IF;
  END IF;

  -- Enrollments indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_status ON course_enrollments(status);
  END IF;

  -- Lesson progress indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_progress') THEN
    CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
  END IF;

  -- Reviews indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_reviews') THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON course_reviews(course_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON course_reviews(student_id);
  END IF;

  -- Messages indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON course_messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON course_messages(recipient_id);
  END IF;

  -- Notifications indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  END IF;

  -- Certificates indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificates') THEN
    CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
  END IF;
END $$;

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
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

-- Enable RLS
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

-- Drop all existing policies
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- Create RLS policies
CREATE POLICY "Creators manage own courses" ON courses FOR ALL USING (creator_id = auth.uid());
CREATE POLICY "View published courses" ON courses FOR SELECT USING (status = 'published');

CREATE POLICY "Creators manage sections" ON course_sections FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "View published sections" ON course_sections FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_sections.course_id AND courses.status = 'published'));

CREATE POLICY "Creators manage lessons" ON lessons FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "View lessons" ON lessons FOR SELECT USING (is_preview = true OR EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = lessons.course_id AND course_enrollments.student_id = auth.uid()));

CREATE POLICY "Students view own enrollments" ON course_enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Creators view enrollments" ON course_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.creator_id = auth.uid()));
CREATE POLICY "Students enroll" ON course_enrollments FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students manage progress" ON lesson_progress FOR ALL USING (student_id = auth.uid());

CREATE POLICY "View reviews" ON course_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Create reviews" ON course_reviews FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "View own messages" ON course_messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Send messages" ON course_messages FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "View own certificates" ON certificates FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Verify certificates" ON certificates FOR SELECT USING (true);

CREATE POLICY "Creators view analytics" ON course_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_analytics.course_id AND courses.creator_id = auth.uid()));
