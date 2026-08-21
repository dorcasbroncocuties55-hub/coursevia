/**
 * Enrollment Service - API endpoints for enrollment management
 * Handles student enrollment, unenrollment, progress tracking, and completion
 */
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Enrollment = Database['public']['Tables']['course_enrollments']['Row'];
type EnrollmentInsert = Database['public']['Tables']['course_enrollments']['Insert'];
type EnrollmentUpdate = Database['public']['Tables']['course_enrollments']['Update'];

type LessonProgress = Database['public']['Tables']['lesson_progress']['Row'];
type LessonProgressInsert = Database['public']['Tables']['lesson_progress']['Insert'];
type LessonProgressUpdate = Database['public']['Tables']['lesson_progress']['Update'];

// ============================================================================
// ENROLLMENT OPERATIONS
// ============================================================================

/**
 * Enroll a student in a course
 */
export async function enrollInCourse(courseId: string, options?: {
  paymentId?: string;
  amountPaid?: number;
}): Promise<{ data: Enrollment | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        throw new Error("Already enrolled in this course");
      }
      // Reactivate cancelled enrollment
      const { data, error } = await supabase
        .from('course_enrollments')
        .update({ 
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    }

    // Get course lessons count
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (lessonsError) throw lessonsError;

    // Create new enrollment
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: courseId,
        student_id: user.id,
        status: 'active',
        total_lessons: lessons?.length || 0,
        payment_id: options?.paymentId,
        amount_paid: options?.amountPaid,
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for creator
    const { data: course } = await supabase
      .from('courses')
      .select('creator_id, title')
      .eq('id', courseId)
      .single();

    if (course) {
      await supabase
        .from('notifications')
        .insert({
          user_id: course.creator_id,
          type: 'enrollment',
          title: 'New Student Enrolled',
          message: `A student has enrolled in "${course.title}"`,
          course_id: courseId,
          enrollment_id: data.id,
          action_url: `/creator/students`,
        });
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Unenroll (cancel enrollment) from a course
 */
export async function unenrollFromCourse(
  enrollmentId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('course_enrollments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('student_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get student's enrollment in a course
 */
export async function getEnrollment(
  courseId: string
): Promise<{ data: Enrollment | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all enrollments for a student
 */
export async function getStudentEnrollments(filters?: {
  status?: 'active' | 'completed' | 'cancelled';
  limit?: number;
  offset?: number;
}): Promise<{ data: (Enrollment & { course: any })[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let query = supabase
      .from('course_enrollments')
      .select('*, course:courses(*)')
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all enrollments for a course (creator view)
 */
export async function getCourseEnrollments(
  courseId: string,
  filters?: {
    status?: 'active' | 'completed' | 'cancelled';
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ 
  data: (Enrollment & { student: any })[] | null; 
  error: Error | null;
  count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Verify user owns the course
    const { data: course } = await supabase
      .from('courses')
      .select('creator_id')
      .eq('id', courseId)
      .single();

    if (!course || course.creator_id !== user.id) {
      throw new Error("Unauthorized");
    }

    let query = supabase
      .from('course_enrollments')
      .select('*, student:profiles!student_id(*)', { count: 'exact' })
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
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

// ============================================================================
// LESSON PROGRESS TRACKING
// ============================================================================

/**
 * Start or update lesson progress
 */
export async function updateLessonProgress(
  lessonId: string,
  progress: {
    videoProgressSeconds?: number;
    progressPercentage?: number;
    status?: 'not_started' | 'in_progress' | 'completed';
  }
): Promise<{ data: LessonProgress | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get enrollment ID
    const { data: lesson } = await supabase
      .from('lessons')
      .select('course_id')
      .eq('id', lessonId)
      .single();

    if (!lesson) throw new Error("Lesson not found");

    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', lesson.course_id)
      .eq('student_id', user.id)
      .single();

    if (!enrollment) throw new Error("Not enrolled in this course");

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', user.id)
      .single();

    const updateData: any = {
      last_accessed_at: new Date().toISOString(),
    };

    if (progress.videoProgressSeconds !== undefined) {
      updateData.video_progress_seconds = progress.videoProgressSeconds;
      updateData.last_position_seconds = progress.videoProgressSeconds;
    }
    if (progress.progressPercentage !== undefined) {
      updateData.progress_percentage = progress.progressPercentage;
    }
    if (progress.status) {
      updateData.status = progress.status;
      if (progress.status === 'completed' && !existing?.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    let data, error;

    if (existing) {
      // Update existing progress
      updateData.view_count = (existing.view_count || 0) + 1;
      
      const result = await supabase
        .from('lesson_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Create new progress record
      const result = await supabase
        .from('lesson_progress')
        .insert({
          enrollment_id: enrollment.id,
          lesson_id: lessonId,
          student_id: user.id,
          ...updateData,
          status: progress.status || 'in_progress',
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    // Update enrollment progress
    await updateEnrollmentProgress(enrollment.id);

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Mark lesson as completed
 */
export async function completLesson(
  lessonId: string
): Promise<{ data: LessonProgress | null; error: Error | null }> {
  return updateLessonProgress(lessonId, {
    status: 'completed',
    progressPercentage: 100,
  });
}

/**
 * Get student's progress for a specific lesson
 */
export async function getLessonProgress(
  lessonId: string
): Promise<{ data: LessonProgress | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get student's progress for all lessons in a course
 */
export async function getCourseProgress(
  courseId: string
): Promise<{ 
  data: {
    enrollment: Enrollment;
    progress: LessonProgress[];
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', user.id)
      .single();

    if (enrollmentError) throw enrollmentError;

    // Get all lesson progress
    const { data: progress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('enrollment_id', enrollment.id);

    if (progressError) throw progressError;

    const completedLessons = progress?.filter(p => p.status === 'completed').length || 0;
    const totalLessons = enrollment.total_lessons || 0;
    const progressPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    return {
      data: {
        enrollment,
        progress: progress || [],
        completedLessons,
        totalLessons,
        progressPercentage,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update enrollment progress (internal helper)
 */
async function updateEnrollmentProgress(enrollmentId: string): Promise<void> {
  try {
    // Get completed lessons count
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('status')
      .eq('enrollment_id', enrollmentId);

    const completedCount = progress?.filter(p => p.status === 'completed').length || 0;

    // Get enrollment
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('total_lessons')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment) return;

    const progressPercentage = enrollment.total_lessons > 0
      ? Math.round((completedCount / enrollment.total_lessons) * 100)
      : 0;

    const updateData: any = {
      completed_lessons: completedCount,
      progress_percentage: progressPercentage,
      last_accessed_at: new Date().toISOString(),
    };

    // Mark as completed if 100%
    if (progressPercentage === 100) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from('course_enrollments')
      .update(updateData)
      .eq('id', enrollmentId);

    // Generate certificate if completed
    if (progressPercentage === 100) {
      await generateCertificate(enrollmentId);
    }
  } catch (error) {
    console.error('Error updating enrollment progress:', error);
  }
}

/**
 * Generate certificate for completed course
 */
async function generateCertificate(enrollmentId: string): Promise<void> {
  try {
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('*, course:courses(id, title, creator_id)')
      .eq('id', enrollmentId)
      .single();

    if (!enrollment || enrollment.certificate_issued_at) return;

    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .single();

    if (existing) return;

    // Generate certificate number and verification code
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const verificationCode = Math.random().toString(36).substr(2, 12).toUpperCase();

    // Create certificate
    await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        course_id: enrollment.course_id,
        student_id: enrollment.student_id,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        completion_date: new Date().toISOString().split('T')[0],
      });

    // Update enrollment
    await supabase
      .from('course_enrollments')
      .update({
        certificate_issued_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: enrollment.student_id,
        type: 'completion',
        title: 'Course Completed!',
        message: `Congratulations! You've completed "${(enrollment.course as any).title}". Your certificate is ready.`,
        course_id: enrollment.course_id,
        enrollment_id: enrollmentId,
        action_url: `/dashboard/courses`,
        priority: 'high',
      });
  } catch (error) {
    console.error('Error generating certificate:', error);
  }
}

/**
 * Get student's certificate
 */
export async function getCertificate(
  enrollmentId: string
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('certificates')
      .select('*, course:courses(title), student:profiles!student_id(*)')
      .eq('enrollment_id', enrollmentId)
      .eq('student_id', user.id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Verify a certificate by verification code
 */
export async function verifyCertificate(
  verificationCode: string
): Promise<{ data: any | null; error: Error | null; isValid: boolean }> {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, course:courses(title), student:profiles!student_id(full_name)')
      .eq('verification_code', verificationCode)
      .eq('is_verified', true)
      .single();

    if (error) {
      return { data: null, error: error as Error, isValid: false };
    }

    return { data, error: null, isValid: true };
  } catch (error) {
    return { data: null, error: error as Error, isValid: false };
  }
}

/**
 * Get enrollment statistics for a creator
 */
export async function getEnrollmentStats(
  timeRange?: '7d' | '30d' | '90d' | '1y'
): Promise<{ 
  data: {
    totalEnrollments: number;
    activeStudents: number;
    completedCourses: number;
    averageProgress: number;
    recentEnrollments: Enrollment[];
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Calculate date filter
    let dateFilter = new Date();
    switch (timeRange) {
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      case '1y':
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
    }

    // Get all enrollments for creator's courses
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select('*, course:courses!inner(creator_id)')
      .eq('course.creator_id', user.id)
      .gte('enrolled_at', dateFilter.toISOString());

    if (error) throw error;

    const totalEnrollments = enrollments?.length || 0;
    const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
    const completedCourses = enrollments?.filter(e => e.status === 'completed').length || 0;
    const averageProgress = enrollments && enrollments.length > 0
      ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress_percentage || 0), 0) / enrollments.length)
      : 0;

    // Get recent enrollments
    const recentEnrollments = enrollments?.slice(0, 10) || [];

    return {
      data: {
        totalEnrollments,
        activeStudents,
        completedCourses,
        averageProgress,
        recentEnrollments,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
