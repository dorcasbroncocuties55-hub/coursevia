/**
 * Notification Service - Real-time notifications with Supabase Realtime
 * Handles notifications for enrollments, messages, reviews, and system events
 */
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Create a notification
 */
export async function createNotification(
  notification: Omit<NotificationInsert, 'id' | 'created_at'>
): Promise<{ data: Notification | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all notifications for current user
 */
export async function getNotifications(
  filters?: {
    unreadOnly?: boolean;
    type?: 'enrollment' | 'message' | 'review' | 'completion' | 'system';
    priority?: 'low' | 'medium' | 'high';
    limit?: number;
    offset?: number;
  }
): Promise<{ 
  data: Notification[] | null; 
  error: Error | null;
  count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters?.unreadOnly) {
      query = query.is('read_at', null);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, error: null, count: count || 0 };
  } catch (error) {
    return { data: null, error: error as Error, count: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete all read notifications
 */
export async function deleteReadNotifications(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .not('read_at', 'is', null);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<{ 
  data: number | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    return { data: count || 0, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{ 
  data: {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    const total = data?.length || 0;
    const unread = data?.filter(n => !n.read_at).length || 0;

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    data?.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
    });

    return {
      data: {
        total,
        unread,
        byType,
        byPriority,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// SPECIALIZED NOTIFICATION CREATORS
// ============================================================================

/**
 * Create enrollment notification
 */
export async function notifyEnrollment(
  creatorId: string,
  courseId: string,
  courseTitle: string,
  enrollmentId: string
): Promise<{ error: Error | null }> {
  return createNotification({
    user_id: creatorId,
    type: 'enrollment',
    title: 'New Student Enrolled',
    message: `A student has enrolled in "${courseTitle}"`,
    course_id: courseId,
    enrollment_id: enrollmentId,
    action_url: `/creator/students`,
    priority: 'medium',
  }).then(result => ({ error: result.error }));
}

/**
 * Create message notification
 */
export async function notifyMessage(
  recipientId: string,
  senderName: string,
  courseId: string,
  courseTitle: string
): Promise<{ error: Error | null }> {
  return createNotification({
    user_id: recipientId,
    type: 'message',
    title: 'New Message',
    message: `${senderName} sent you a message about "${courseTitle}"`,
    course_id: courseId,
    action_url: `/creator/messages`,
    priority: 'medium',
  }).then(result => ({ error: result.error }));
}

/**
 * Create review notification
 */
export async function notifyReview(
  creatorId: string,
  courseId: string,
  courseTitle: string,
  rating: number,
  reviewId: string
): Promise<{ error: Error | null }> {
  const stars = '⭐'.repeat(rating);
  return createNotification({
    user_id: creatorId,
    type: 'review',
    title: 'New Course Review',
    message: `Your course "${courseTitle}" received a ${stars} review`,
    course_id: courseId,
    review_id: reviewId,
    action_url: `/creator/courses/${courseId}`,
    priority: rating >= 4 ? 'medium' : 'high',
  }).then(result => ({ error: result.error }));
}

/**
 * Create course completion notification
 */
export async function notifyCompletion(
  studentId: string,
  courseId: string,
  courseTitle: string,
  enrollmentId: string
): Promise<{ error: Error | null }> {
  return createNotification({
    user_id: studentId,
    type: 'completion',
    title: 'Course Completed! 🎉',
    message: `Congratulations! You've completed "${courseTitle}". Your certificate is ready.`,
    course_id: courseId,
    enrollment_id: enrollmentId,
    action_url: `/dashboard/courses`,
    priority: 'high',
  }).then(result => ({ error: result.error }));
}

/**
 * Create system notification
 */
export async function notifySystem(
  userId: string,
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  actionUrl?: string
): Promise<{ error: Error | null }> {
  return createNotification({
    user_id: userId,
    type: 'system',
    title,
    message,
    action_url: actionUrl,
    priority,
  }).then(result => ({ error: result.error }));
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      async (payload) => {
        const notification = payload.new as Notification;
        
        // Only handle notifications for current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (notification.user_id === user.id) {
          onNotification(notification);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      },
      async (payload) => {
        const notification = payload.new as Notification;
        
        // Handle read status updates
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (notification.user_id === user.id) {
          onNotification(notification);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
      },
      async (payload) => {
        const notification = payload.old as Notification;
        
        // Handle deletion
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (notification.user_id === user.id) {
          onNotification({ ...notification, deleted: true } as any);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to notifications');
      } else if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Failed to subscribe to notifications'));
      }
    });

  return channel;
}

/**
 * Subscribe to unread count changes
 */
export function subscribeToUnreadCount(
  onCountChange: (count: number) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  const channel = supabase
    .channel('notification-count')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
      },
      async () => {
        // Fetch new count whenever any notification changes
        const { data } = await getUnreadNotificationCount();
        if (data !== null) {
          onCountChange(data);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to unread count');
      } else if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Failed to subscribe to unread count'));
      }
    });

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Notification preferences structure
 */
export interface NotificationPreferences {
  emailNotifications: {
    enrollments: boolean;
    messages: boolean;
    reviews: boolean;
    completions: boolean;
    system: boolean;
  };
  pushNotifications: {
    enrollments: boolean;
    messages: boolean;
    reviews: boolean;
    completions: boolean;
    system: boolean;
  };
  inAppNotifications: {
    enrollments: boolean;
    messages: boolean;
    reviews: boolean;
    completions: boolean;
    system: boolean;
  };
}

/**
 * Get user notification preferences (stored in profile metadata)
 */
export async function getNotificationPreferences(): Promise<{ 
  data: NotificationPreferences | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Return default preferences if none set
    const preferences: NotificationPreferences = (data?.notification_preferences as any) || {
      emailNotifications: {
        enrollments: true,
        messages: true,
        reviews: true,
        completions: true,
        system: true,
      },
      pushNotifications: {
        enrollments: true,
        messages: true,
        reviews: false,
        completions: true,
        system: false,
      },
      inAppNotifications: {
        enrollments: true,
        messages: true,
        reviews: true,
        completions: true,
        system: true,
      },
    };

    return { data: preferences, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: preferences as any })
      .eq('id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================================================
// NOTIFICATION BATCHING & GROUPING
// ============================================================================

/**
 * Group notifications by type and time
 */
export function groupNotifications(
  notifications: Notification[]
): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  notifications.forEach(notification => {
    const notificationDate = new Date(notification.created_at);

    if (notificationDate >= today) {
      groups.today.push(notification);
    } else if (notificationDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    enrollment: '👥',
    message: '💬',
    review: '⭐',
    completion: '🎉',
    system: '🔔',
  };
  return icons[type] || '📬';
}

/**
 * Get notification color based on priority
 */
export function getNotificationColor(priority: string): string {
  const colors: Record<string, string> = {
    low: '#6B7280',
    medium: '#4F46E5',
    high: '#EF4444',
  };
  return colors[priority] || '#4F46E5';
}

/**
 * Format notification time (relative)
 */
export function formatNotificationTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return time.toLocaleDateString();
}

// ============================================================================
// UTILITY HOOKS FOR REACT
// ============================================================================

/**
 * Helper to create a notification subscription
 * Returns cleanup function
 */
export function createNotificationSubscription(
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
): () => void {
  const channel = subscribeToNotifications(onNotification, onError);

  return () => {
    unsubscribeChannel(channel);
  };
}

/**
 * Helper to create an unread count subscription
 * Returns cleanup function
 */
export function createUnreadCountSubscription(
  onCountChange: (count: number) => void,
  onError?: (error: Error) => void
): () => void {
  const channel = subscribeToUnreadCount(onCountChange, onError);

  return () => {
    unsubscribeChannel(channel);
  };
}
