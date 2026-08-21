/**
 * Analytics Service - API endpoints for course analytics and reporting
 * Handles student analytics, course performance, revenue tracking, and engagement metrics
 */
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type CourseAnalytics = Database['public']['Tables']['course_analytics']['Row'];

// ============================================================================
// CREATOR ANALYTICS
// ============================================================================

/**
 * Get overall creator dashboard statistics
 */
export async function getCreatorDashboardStats(
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all'
): Promise<{ 
  data: {
    totalStudents: number;
    activeStudents: number;
    totalRevenue: number;
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    avgCourseRating: number;
    completionRate: number;
    revenueGrowth: number;
    studentGrowth: number;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Calculate date filter
    const dateFilter = getDateFilter(timeRange);

    // Get creator's courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('creator_id', user.id);

    const courseIds = courses?.map(c => c.id) || [];

    if (courseIds.length === 0) {
      return {
        data: {
          totalStudents: 0,
          activeStudents: 0,
          totalRevenue: 0,
          totalCourses: 0,
          publishedCourses: 0,
          totalEnrollments: 0,
          avgCourseRating: 0,
          completionRate: 0,
          revenueGrowth: 0,
          studentGrowth: 0,
        },
        error: null,
      };
    }

    // Get enrollments
    let enrollmentQuery = supabase
      .from('course_enrollments')
      .select('*')
      .in('course_id', courseIds);

    if (dateFilter) {
      enrollmentQuery = enrollmentQuery.gte('enrolled_at', dateFilter);
    }

    const { data: enrollments } = await enrollmentQuery;

    // Calculate unique students
    const uniqueStudents = new Set(enrollments?.map(e => e.student_id) || []).size;
    const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;

    // Calculate revenue
    const totalRevenue = enrollments?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0;

    // Get course stats
    const { data: courseStats } = await supabase
      .from('courses')
      .select('status, average_rating')
      .eq('creator_id', user.id);

    const totalCourses = courseStats?.length || 0;
    const publishedCourses = courseStats?.filter(c => c.status === 'published').length || 0;
    const avgCourseRating = courseStats && courseStats.length > 0
      ? courseStats.reduce((sum, c) => sum + (c.average_rating || 0), 0) / courseStats.length
      : 0;

    // Calculate completion rate
    const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
    const completionRate = enrollments && enrollments.length > 0
      ? (completedEnrollments / enrollments.length) * 100
      : 0;

    // Calculate growth (compare with previous period)
    let revenueGrowth = 0;
    let studentGrowth = 0;

    if (dateFilter) {
      const previousPeriodStart = new Date(dateFilter);
      const periodLength = new Date().getTime() - previousPeriodStart.getTime();
      const previousPeriodEnd = new Date(previousPeriodStart.getTime() - periodLength);

      const { data: previousEnrollments } = await supabase
        .from('course_enrollments')
        .select('*')
        .in('course_id', courseIds)
        .gte('enrolled_at', previousPeriodEnd.toISOString())
        .lt('enrolled_at', dateFilter);

      const previousRevenue = previousEnrollments?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0;
      const previousStudents = new Set(previousEnrollments?.map(e => e.student_id) || []).size;

      revenueGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;
      studentGrowth = previousStudents > 0 
        ? ((uniqueStudents - previousStudents) / previousStudents) * 100 
        : 0;
    }

    return {
      data: {
        totalStudents: uniqueStudents,
        activeStudents,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCourses,
        publishedCourses,
        totalEnrollments: enrollments?.length || 0,
        avgCourseRating: Math.round(avgCourseRating * 10) / 10,
        completionRate: Math.round(completionRate),
        revenueGrowth: Math.round(revenueGrowth),
        studentGrowth: Math.round(studentGrowth),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get revenue analytics over time
 */
export async function getRevenueAnalytics(
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<{ 
  data: {
    timeline: Array<{ date: string; revenue: number; enrollments: number }>;
    totalRevenue: number;
    averageOrderValue: number;
    topCourses: Array<{ courseId: string; title: string; revenue: number; enrollments: number }>;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const dateFilter = getDateFilter(timeRange);
    if (!dateFilter) throw new Error("Invalid time range");

    // Get creator's courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .eq('creator_id', user.id);

    const courseIds = courses?.map(c => c.id) || [];

    if (courseIds.length === 0) {
      return {
        data: {
          timeline: [],
          totalRevenue: 0,
          averageOrderValue: 0,
          topCourses: [],
        },
        error: null,
      };
    }

    // Get enrollments with revenue
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id, amount_paid, enrolled_at')
      .in('course_id', courseIds)
      .gte('enrolled_at', dateFilter)
      .order('enrolled_at', { ascending: true });

    // Group by date
    const timelineMap = new Map<string, { revenue: number; enrollments: number }>();
    let totalRevenue = 0;

    enrollments?.forEach(e => {
      const date = e.enrolled_at.split('T')[0]; // YYYY-MM-DD
      const revenue = e.amount_paid || 0;
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { revenue: 0, enrollments: 0 });
      }
      
      const entry = timelineMap.get(date)!;
      entry.revenue += revenue;
      entry.enrollments += 1;
      totalRevenue += revenue;
    });

    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      enrollments: data.enrollments,
    }));

    // Calculate average order value
    const averageOrderValue = enrollments && enrollments.length > 0
      ? totalRevenue / enrollments.length
      : 0;

    // Get top courses by revenue
    const courseRevenueMap = new Map<string, { revenue: number; enrollments: number }>();
    
    enrollments?.forEach(e => {
      if (!courseRevenueMap.has(e.course_id)) {
        courseRevenueMap.set(e.course_id, { revenue: 0, enrollments: 0 });
      }
      const entry = courseRevenueMap.get(e.course_id)!;
      entry.revenue += e.amount_paid || 0;
      entry.enrollments += 1;
    });

    const topCourses = Array.from(courseRevenueMap.entries())
      .map(([courseId, data]) => {
        const course = courses?.find(c => c.id === courseId);
        return {
          courseId,
          title: course?.title || 'Unknown',
          revenue: Math.round(data.revenue * 100) / 100,
          enrollments: data.enrollments,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      data: {
        timeline,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        topCourses,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get student engagement analytics
 */
export async function getEngagementAnalytics(
  courseId?: string,
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<{ 
  data: {
    totalViews: number;
    avgSessionDuration: number;
    completionRate: number;
    dropoffRate: number;
    activeStudents: number;
    lessonEngagement: Array<{ lessonId: string; title: string; views: number; avgProgress: number }>;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const dateFilter = getDateFilter(timeRange);

    // Get creator's courses
    let coursesQuery = supabase
      .from('courses')
      .select('id')
      .eq('creator_id', user.id);

    if (courseId) {
      coursesQuery = coursesQuery.eq('id', courseId);
    }

    const { data: courses } = await coursesQuery;
    const courseIds = courses?.map(c => c.id) || [];

    if (courseIds.length === 0) {
      return {
        data: {
          totalViews: 0,
          avgSessionDuration: 0,
          completionRate: 0,
          dropoffRate: 0,
          activeStudents: 0,
          lessonEngagement: [],
        },
        error: null,
      };
    }

    // Get lesson progress data
    let progressQuery = supabase
      .from('lesson_progress')
      .select('*, lesson:lessons!inner(course_id, title)')
      .in('lesson.course_id', courseIds);

    if (dateFilter) {
      progressQuery = progressQuery.gte('last_accessed_at', dateFilter);
    }

    const { data: progress } = await progressQuery;

    // Calculate metrics
    const totalViews = progress?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
    const avgSessionDuration = progress && progress.length > 0
      ? progress.reduce((sum, p) => sum + (p.video_progress_seconds || 0), 0) / progress.length
      : 0;

    // Get enrollments for completion rate
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('status')
      .in('course_id', courseIds);

    const completionRate = enrollments && enrollments.length > 0
      ? (enrollments.filter(e => e.status === 'completed').length / enrollments.length) * 100
      : 0;

    const dropoffRate = enrollments && enrollments.length > 0
      ? (enrollments.filter(e => e.status === 'cancelled').length / enrollments.length) * 100
      : 0;

    // Active students (viewed in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentProgress } = await supabase
      .from('lesson_progress')
      .select('student_id, lesson:lessons!inner(course_id)')
      .in('lesson.course_id', courseIds)
      .gte('last_accessed_at', sevenDaysAgo.toISOString());

    const activeStudents = new Set(recentProgress?.map(p => p.student_id) || []).size;

    // Lesson engagement
    const lessonEngagementMap = new Map<string, { views: number; totalProgress: number; count: number }>();
    
    progress?.forEach(p => {
      const lessonId = p.lesson_id;
      if (!lessonEngagementMap.has(lessonId)) {
        lessonEngagementMap.set(lessonId, { views: 0, totalProgress: 0, count: 0 });
      }
      const entry = lessonEngagementMap.get(lessonId)!;
      entry.views += p.view_count || 0;
      entry.totalProgress += p.progress_percentage || 0;
      entry.count += 1;
    });

    const lessonEngagement = Array.from(lessonEngagementMap.entries())
      .map(([lessonId, data]) => {
        const lesson = progress?.find(p => p.lesson_id === lessonId)?.lesson as any;
        return {
          lessonId,
          title: lesson?.title || 'Unknown',
          views: data.views,
          avgProgress: Math.round(data.totalProgress / data.count),
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      data: {
        totalViews,
        avgSessionDuration: Math.round(avgSessionDuration),
        completionRate: Math.round(completionRate),
        dropoffRate: Math.round(dropoffRate),
        activeStudents,
        lessonEngagement,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get course performance comparison
 */
export async function getCoursePerformanceComparison(): Promise<{ 
  data: Array<{
    courseId: string;
    title: string;
    students: number;
    revenue: number;
    avgRating: number;
    completionRate: number;
    engagement: number;
  }> | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get all creator's published courses
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        average_rating,
        total_enrollments,
        course_enrollments (
          status,
          amount_paid
        )
      `)
      .eq('creator_id', user.id)
      .eq('status', 'published');

    if (!courses || courses.length === 0) {
      return { data: [], error: null };
    }

    const performance = await Promise.all(
      courses.map(async (course) => {
        const enrollments = course.course_enrollments || [];
        const students = enrollments.length;
        const revenue = enrollments.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
        const completedCount = enrollments.filter(e => e.status === 'completed').length;
        const completionRate = students > 0 ? (completedCount / students) * 100 : 0;

        // Get engagement (total views)
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('view_count, lesson:lessons!inner(course_id)')
          .eq('lesson.course_id', course.id);

        const engagement = progress?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

        return {
          courseId: course.id,
          title: course.title,
          students,
          revenue: Math.round(revenue * 100) / 100,
          avgRating: course.average_rating || 0,
          completionRate: Math.round(completionRate),
          engagement,
        };
      })
    );

    return { data: performance, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get student demographics and behavior
 */
export async function getStudentAnalytics(
  courseId?: string
): Promise<{ 
  data: {
    totalStudents: number;
    newStudents: number;
    returningStudents: number;
    avgCoursesPerStudent: number;
    studentRetention: number;
    topStudents: Array<{ 
      studentId: string; 
      name: string; 
      coursesEnrolled: number; 
      totalSpent: number;
      avgProgress: number;
    }>;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get creator's courses
    let coursesQuery = supabase
      .from('courses')
      .select('id')
      .eq('creator_id', user.id);

    if (courseId) {
      coursesQuery = coursesQuery.eq('id', courseId);
    }

    const { data: courses } = await coursesQuery;
    const courseIds = courses?.map(c => c.id) || [];

    if (courseIds.length === 0) {
      return {
        data: {
          totalStudents: 0,
          newStudents: 0,
          returningStudents: 0,
          avgCoursesPerStudent: 0,
          studentRetention: 0,
          topStudents: [],
        },
        error: null,
      };
    }

    // Get all enrollments
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('student_id, enrolled_at, amount_paid, progress_percentage, status')
      .in('course_id', courseIds);

    // Calculate unique students
    const uniqueStudents = new Set(enrollments?.map(e => e.student_id) || []);
    const totalStudents = uniqueStudents.size;

    // New vs returning (enrolled in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newStudents = enrollments?.filter(e => 
      new Date(e.enrolled_at) >= thirtyDaysAgo
    ).length || 0;

    // Calculate avg courses per student
    const avgCoursesPerStudent = totalStudents > 0
      ? (enrollments?.length || 0) / totalStudents
      : 0;

    // Student retention (active / total)
    const activeStudents = enrollments?.filter(e => e.status === 'active').length || 0;
    const studentRetention = totalStudents > 0
      ? (activeStudents / totalStudents) * 100
      : 0;

    // Top students by engagement
    const studentMap = new Map<string, { 
      coursesEnrolled: number; 
      totalSpent: number; 
      totalProgress: number;
    }>();

    enrollments?.forEach(e => {
      if (!studentMap.has(e.student_id)) {
        studentMap.set(e.student_id, { coursesEnrolled: 0, totalSpent: 0, totalProgress: 0 });
      }
      const entry = studentMap.get(e.student_id)!;
      entry.coursesEnrolled += 1;
      entry.totalSpent += e.amount_paid || 0;
      entry.totalProgress += e.progress_percentage || 0;
    });

    // Get student profiles
    const topStudentIds = Array.from(studentMap.keys()).slice(0, 10);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', topStudentIds);

    const topStudents = Array.from(studentMap.entries())
      .map(([studentId, data]) => {
        const profile = profiles?.find(p => p.id === studentId);
        return {
          studentId,
          name: profile?.full_name || 'Unknown',
          coursesEnrolled: data.coursesEnrolled,
          totalSpent: Math.round(data.totalSpent * 100) / 100,
          avgProgress: Math.round(data.totalProgress / data.coursesEnrolled),
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      data: {
        totalStudents,
        newStudents,
        returningStudents: totalStudents - newStudents,
        avgCoursesPerStudent: Math.round(avgCoursesPerStudent * 10) / 10,
        studentRetention: Math.round(studentRetention),
        topStudents,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Record course analytics event
 */
export async function recordAnalyticsEvent(
  courseId: string,
  eventType: 'view' | 'enrollment' | 'completion' | 'review',
  metadata?: Record<string, any>
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    await supabase
      .from('course_analytics')
      .insert({
        course_id: courseId,
        event_type: eventType,
        user_id: user.id,
        metadata: metadata || {},
      });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateFilter(timeRange?: '7d' | '30d' | '90d' | '1y' | 'all'): string | null {
  if (!timeRange || timeRange === 'all') return null;

  const date = new Date();
  switch (timeRange) {
    case '7d':
      date.setDate(date.getDate() - 7);
      break;
    case '30d':
      date.setDate(date.getDate() - 30);
      break;
    case '90d':
      date.setDate(date.getDate() - 90);
      break;
    case '1y':
      date.setFullYear(date.getFullYear() - 1);
      break;
  }
  return date.toISOString();
}
