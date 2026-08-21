/**
 * Messaging Service - Real-time messaging with Supabase Realtime
 * Handles course messages between creators and students
 */
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CourseMessage = Database['public']['Tables']['course_messages']['Row'];
type CourseMessageInsert = Database['public']['Tables']['course_messages']['Insert'];
type CourseMessageUpdate = Database['public']['Tables']['course_messages']['Update'];

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Send a message in a course conversation
 */
export async function sendMessage(
  courseId: string,
  recipientId: string,
  content: string,
  metadata?: Record<string, any>
): Promise<{ data: CourseMessage | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('course_messages')
      .insert({
        course_id: courseId,
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'message',
        title: 'New Message',
        message: `You have a new message`,
        course_id: courseId,
        action_url: `/creator/messages`,
      });

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get conversation between user and another user for a course
 */
export async function getConversation(
  courseId: string,
  otherUserId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ 
  data: CourseMessage[] | null; 
  error: Error | null;
  count: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let query = supabase
      .from('course_messages')
      .select('*', { count: 'exact' })
      .eq('course_id', courseId)
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Mark messages as read
    await markMessagesAsRead(courseId, otherUserId);

    return { data, error: null, count: count || 0 };
  } catch (error) {
    return { data: null, error: error as Error, count: 0 };
  }
}

/**
 * Get all conversations for a user (inbox)
 */
export async function getConversations(
  filters?: {
    courseId?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ 
  data: Array<{
    courseId: string;
    courseTitle: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    isStarred: boolean;
  }> | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get all messages where user is sender or recipient
    let query = supabase
      .from('course_messages')
      .select(`
        *,
        course:courses(id, title),
        sender:profiles!sender_id(id, full_name, avatar_url),
        recipient:profiles!recipient_id(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Group by conversation (course + other user)
    const conversationMap = new Map<string, any>();

    messages?.forEach((msg: any) => {
      const isReceived = msg.recipient_id === user.id;
      const otherUserId = isReceived ? msg.sender_id : msg.recipient_id;
      const otherUser = isReceived ? msg.sender : msg.recipient;
      const conversationKey = `${msg.course_id}-${otherUserId}`;

      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          courseId: msg.course_id,
          courseTitle: msg.course?.title || 'Unknown Course',
          otherUserId,
          otherUserName: otherUser?.full_name || 'Unknown User',
          otherUserAvatar: otherUser?.avatar_url,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
          isStarred: false,
        });
      }

      // Count unread messages
      if (isReceived && !msg.read_at) {
        const conv = conversationMap.get(conversationKey);
        conv.unreadCount += 1;
      }
    });

    let conversations = Array.from(conversationMap.values());

    // Apply filters
    if (filters?.unreadOnly) {
      conversations = conversations.filter(c => c.unreadCount > 0);
    }

    // Sort by last message time
    conversations.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    // Apply pagination
    if (filters?.offset !== undefined) {
      const start = filters.offset;
      const end = start + (filters.limit || 20);
      conversations = conversations.slice(start, end);
    }

    return { data: conversations, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  courseId: string,
  senderId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('course_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('sender_id', senderId)
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(
  messageId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('course_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id); // Can only delete own messages

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<{ 
  data: number | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { count, error } = await supabase
      .from('course_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    return { data: count || 0, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToConversation(
  courseId: string,
  otherUserId: string,
  onMessage: (message: CourseMessage) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`conversation:${courseId}:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'course_messages',
        filter: `course_id=eq.${courseId}`,
      },
      async (payload) => {
        const message = payload.new as CourseMessage;
        
        // Only handle messages between these two users
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const isRelevant = 
          (message.sender_id === user.id && message.recipient_id === otherUserId) ||
          (message.sender_id === otherUserId && message.recipient_id === user.id);

        if (isRelevant) {
          onMessage(message);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to conversation');
      } else if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Failed to subscribe to conversation'));
      }
    });

  return channel;
}

/**
 * Subscribe to all incoming messages (inbox updates)
 */
export function subscribeToInbox(
  onMessage: (message: CourseMessage) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  const channel = supabase
    .channel('inbox')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'course_messages',
      },
      async (payload) => {
        const message = payload.new as CourseMessage;
        
        // Only handle messages received by current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (message.recipient_id === user.id) {
          onMessage(message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'course_messages',
      },
      async (payload) => {
        const message = payload.new as CourseMessage;
        
        // Handle read status updates
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (message.sender_id === user.id || message.recipient_id === user.id) {
          onMessage(message);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to inbox');
      } else if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Failed to subscribe to inbox'));
      }
    });

  return channel;
}

/**
 * Subscribe to typing indicators
 */
export function subscribeToTypingIndicators(
  courseId: string,
  otherUserId: string,
  onTyping: (isTyping: boolean) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`typing:${courseId}:${otherUserId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const otherUserPresence = state[otherUserId];
      onTyping(otherUserPresence?.[0]?.isTyping || false);
    })
    .subscribe();

  return channel;
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(
  courseId: string,
  recipientId: string,
  isTyping: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const channel = supabase.channel(`typing:${courseId}:${recipientId}`);
  
  await channel.subscribe();
  
  if (isTyping) {
    await channel.track({ isTyping: true });
  } else {
    await channel.untrack();
  }
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

// ============================================================================
// MESSAGE SEARCH & FILTERING
// ============================================================================

/**
 * Search messages by content
 */
export async function searchMessages(
  query: string,
  filters?: {
    courseId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<{ data: CourseMessage[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let dbQuery = supabase
      .from('course_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false });

    if (filters?.courseId) {
      dbQuery = dbQuery.eq('course_id', filters.courseId);
    }
    if (filters?.startDate) {
      dbQuery = dbQuery.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      dbQuery = dbQuery.lte('created_at', filters.endDate);
    }
    if (filters?.limit) {
      dbQuery = dbQuery.limit(filters.limit);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get message statistics for a course
 */
export async function getMessageStats(
  courseId: string
): Promise<{ 
  data: {
    totalMessages: number;
    unreadMessages: number;
    activeConversations: number;
    avgResponseTime: number; // in minutes
  } | null; 
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get all messages for the course
    const { data: messages, error } = await supabase
      .from('course_messages')
      .select('*')
      .eq('course_id', courseId)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (error) throw error;

    const totalMessages = messages?.length || 0;
    const unreadMessages = messages?.filter(
      m => m.recipient_id === user.id && !m.read_at
    ).length || 0;

    // Calculate active conversations (unique other users)
    const otherUserIds = new Set(
      messages?.map(m => 
        m.sender_id === user.id ? m.recipient_id : m.sender_id
      )
    );
    const activeConversations = otherUserIds.size;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    messages?.forEach((msg, index) => {
      if (msg.sender_id === user.id && index > 0) {
        const prevMsg = messages[index - 1];
        if (prevMsg.recipient_id === user.id) {
          const responseTime = 
            new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
          totalResponseTime += responseTime;
          responseCount += 1;
        }
      }
    });

    const avgResponseTime = responseCount > 0
      ? Math.round(totalResponseTime / responseCount / 60000) // Convert to minutes
      : 0;

    return {
      data: {
        totalMessages,
        unreadMessages,
        activeConversations,
        avgResponseTime,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// UTILITY HOOKS FOR REACT
// ============================================================================

/**
 * Custom hook data structure for real-time messages
 */
export interface UseMessagesOptions {
  courseId: string;
  otherUserId: string;
  onNewMessage?: (message: CourseMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Helper to create a real-time message subscription
 * Returns cleanup function
 */
export function createMessageSubscription(
  options: UseMessagesOptions
): () => void {
  const channel = subscribeToConversation(
    options.courseId,
    options.otherUserId,
    (message) => {
      options.onNewMessage?.(message);
    },
    options.onError
  );

  return () => {
    unsubscribeChannel(channel);
  };
}
