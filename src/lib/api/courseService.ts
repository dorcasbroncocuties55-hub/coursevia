/**
 * Course Service - API endpoints for course CRUD operations
 * Handles creating, reading, updating, deleting, and publishing courses
 */
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type CourseUpdate = Database['public']['Tables']['courses']['Update'];

type CourseSection = Database['public']['Tables']['course_sections']['Row'];
type CourseSectionInsert = Database['public']['Tables']['course_sections']['Insert'];

type Lesson = Database['public']['Tables']['lessons']['Row'];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type LessonUpdate = Database['public']['Tables']['lessons']['Update'];

// ============================================================================
// COURSE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new course
 */
export async function createCourse(courseData: {
  title: string;
  description?: string;
  short_description?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
  is_free?: boolean;
  tags?: string[];
}): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Generate slug from title
    const slug = courseData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const { data, error } = await supabase
      .from('courses')
      .insert({
        creator_id: user.id,
        title: courseData.title,
        slug,
        description: courseData.description,
        short_description: courseData.short_description,
        category: courseData.category,
        level: courseData.level || 'beginner',
        price: courseData.price || 0,
        is_free: courseData.is_free ?? (courseData.price === 0),
        tags: courseData.tags,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get course with all sections and lessons
 */
export async function getCourseWithContent(courseId: string): Promise<{
  data: {
    course: Course;
    sections: (CourseSection & { lessons: Lesson[] })[];
  } | null;
  error: Error | null;
}> {
  try {
    // Get course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Get sections
    const { data: sections, error: sectionsError } = await supabase
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (sectionsError) throw sectionsError;

    // Get lessons for each section
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (lessonsError) throw lessonsError;

    // Group lessons by section
    const sectionsWithLessons = sections.map(section => ({
      ...section,
      lessons: lessons.filter(lesson => lesson.section_id === section.id),
    }));

    return {
      data: { course, sections: sectionsWithLessons },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all courses for the current creator
 */
export async function getCreatorCourses(filters?: {
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  search?: string;
}): Promise<{ data: Course[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let query = supabase
      .from('courses')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all published courses (public endpoint)
 */
export async function getPublishedCourses(filters?: {
  category?: string;
  level?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: Course[] | null; error: Error | null; count: number }> {
  try {
    let query = supabase
      .from('courses')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.search) {
      query = query.textSearch('title', filters.search);
    }
    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, error: null, count: count || 0 };
  } catch (error) {
    return { data: null, error: error as Error, count: 0 };
  }
}

/**
 * Update a course
 */
export async function updateCourse(
  courseId: string,
  updates: Partial<CourseUpdate>
): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('creator_id', user.id) // Ensure user owns the course
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('creator_id', user.id); // Ensure user owns the course

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Publish a course (change status to published)
 */
export async function publishCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Validate course has required content before publishing
    const { data: sections } = await supabase
      .from('course_sections')
      .select('id')
      .eq('course_id', courseId);

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (!sections || sections.length === 0) {
      throw new Error("Course must have at least one section");
    }
    if (!lessons || lessons.length === 0) {
      throw new Error("Course must have at least one lesson");
    }

    const { data, error } = await supabase
      .from('courses')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Unpublish a course (change status back to draft)
 */
export async function unpublishCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('courses')
      .update({ status: 'draft' })
      .eq('id', courseId)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Archive a course
 */
export async function archiveCourse(courseId: string): Promise<{ data: Course | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('courses')
      .update({ status: 'archived' })
      .eq('id', courseId)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// COURSE SECTIONS
// ============================================================================

/**
 * Create a new section
 */
export async function createSection(sectionData: {
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
}): Promise<{ data: CourseSection | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('course_sections')
      .insert(sectionData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update a section
 */
export async function updateSection(
  sectionId: string,
  updates: Partial<CourseSectionInsert>
): Promise<{ data: CourseSection | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('course_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a section
 */
export async function deleteSection(sectionId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Reorder sections
 */
export async function reorderSections(
  courseId: string,
  sectionIds: string[]
): Promise<{ error: Error | null }> {
  try {
    // Update order_index for each section
    const updates = sectionIds.map((id, index) => ({
      id,
      order_index: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('course_sections')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('course_id', courseId);

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================================================
// LESSONS
// ============================================================================

/**
 * Create a new lesson
 */
export async function createLesson(lessonData: {
  course_id: string;
  section_id?: string;
  title: string;
  description?: string;
  content_type: 'video' | 'article' | 'quiz' | 'assignment' | 'live_session';
  content_url?: string;
  order_index: number;
  is_preview?: boolean;
}): Promise<{ data: Lesson | null; error: Error | null }> {
  try {
    // Generate slug from title
    const slug = lessonData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        ...lessonData,
        slug,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update a lesson
 */
export async function updateLesson(
  lessonId: string,
  updates: Partial<LessonUpdate>
): Promise<{ data: Lesson | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete a lesson
 */
export async function deleteLesson(lessonId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Reorder lessons within a section
 */
export async function reorderLessons(
  sectionId: string,
  lessonIds: string[]
): Promise<{ error: Error | null }> {
  try {
    const updates = lessonIds.map((id, index) => ({
      id,
      order_index: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('lessons')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('section_id', sectionId);

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get course statistics
 */
export async function getCourseStats(courseId: string): Promise<{
  data: {
    total_enrollments: number;
    active_students: number;
    completion_rate: number;
    average_rating: number;
    total_reviews: number;
    total_revenue: number;
  } | null;
  error: Error | null;
}> {
  try {
    // Get enrollment stats
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('status')
      .eq('course_id', courseId);

    if (enrollError) throw enrollError;

    const totalEnrollments = enrollments?.length || 0;
    const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
    const completedStudents = enrollments?.filter(e => e.status === 'completed').length || 0;
    const completionRate = totalEnrollments > 0 ? (completedStudents / totalEnrollments) * 100 : 0;

    // Get review stats
    const { data: course } = await supabase
      .from('courses')
      .select('average_rating, total_reviews, price')
      .eq('id', courseId)
      .single();

    const totalRevenue = (course?.price || 0) * totalEnrollments;

    return {
      data: {
        total_enrollments: totalEnrollments,
        active_students: activeStudents,
        completion_rate: Math.round(completionRate),
        average_rating: course?.average_rating || 0,
        total_reviews: course?.total_reviews || 0,
        total_revenue: totalRevenue,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
