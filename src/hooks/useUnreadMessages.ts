import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UnreadCount {
  channelId?: string | null;
  dmUserId?: string | null;
  count: number;
  lastMessageAt?: string;
}

interface UnreadMessage {
  channel_id: string | null;
  dm_user_id: string | null;
  unread_count: number;
  updated_at: string;
  user_id: string;
}

const BATCH_DELAY = 2000; // 2 seconds batching delay
const MAX_NOTIFICATIONS_PER_DAY = 10;

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);

    // Return cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, delay]);

  return debouncedCallback;
}

export function useUnreadMessages(userId: string) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const supabase = createClient();
  const notificationCountRef = useRef(0);
  const lastUpdateRef = useRef<{ [key: string]: number }>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load unread counts function
  const loadUnreadCounts = async () => {
    const { data, error } = await supabase
      .from('unread_messages')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading unread counts:', error);
      return;
    }

    // Implement deduplication
    const uniqueUpdates = (data as UnreadMessage[]).reduce((acc: UnreadCount[], item) => {
      const key = item.channel_id || item.dm_user_id;
      const existing = acc.find(x => 
        (x.channelId === item.channel_id && x.dmUserId === item.dm_user_id)
      );

      if (!existing) {
        acc.push({
          channelId: item.channel_id,
          dmUserId: item.dm_user_id,
          count: item.unread_count,
          lastMessageAt: item.updated_at
        });
      }

      return acc;
    }, []);

    setUnreadCounts(uniqueUpdates);
  };

  // Debounced update function
  const debouncedUpdate = useDebounce(loadUnreadCounts, BATCH_DELAY);

  // Load initial unread counts and set up realtime subscription
  useEffect(() => {
    if (!userId) {
      console.log('No user ID provided to useUnreadMessages');
      return;
    }

    // Initial load
    loadUnreadCounts();

    // Set up realtime subscription with better error handling
    const channel = supabase
      .channel(`unread_messages:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unread_messages',
        filter: `user_id=eq.${userId}`
      }, (payload: RealtimePostgresChangesPayload<UnreadMessage>) => {
        const now = Date.now();
        const newData = payload.new as UnreadMessage;
        const key = newData?.channel_id || newData?.dm_user_id;
        
        if (!key) return;

        // Implement rate limiting
        if (notificationCountRef.current >= MAX_NOTIFICATIONS_PER_DAY) {
          console.log('Daily notification limit reached');
          return;
        }

        // Implement threshold checking
        const lastUpdate = lastUpdateRef.current[key] || 0;
        if (now - lastUpdate < BATCH_DELAY) {
          console.log('Batching notification update');
          return;
        }

        lastUpdateRef.current[key] = now;
        notificationCountRef.current++;
        
        // Store cleanup function
        cleanupRef.current = debouncedUpdate();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to unread messages');
        }
      });

    // Reset notification count daily
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - Date.now();
    
    const resetTimer = setTimeout(() => {
      notificationCountRef.current = 0;
    }, timeUntilMidnight);

    return () => {
      // Clean up debounced function
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      supabase.removeChannel(channel);
      clearTimeout(resetTimer);
    };
  }, [userId, debouncedUpdate]);

  // Function to mark messages as read with error handling
  const markAsRead = async (channelId?: string, dmUserId?: string) => {
    try {
      const { error } = await supabase.rpc('reset_unread_count', {
        p_user_id: userId,
        p_channel_id: channelId,
        p_dm_user_id: dmUserId
      });

      if (error) throw error;

      // Optimistically update the UI
      setUnreadCounts(prev => 
        prev.map(item => {
          if (
            (channelId && item.channelId === channelId) || 
            (dmUserId && item.dmUserId === dmUserId)
          ) {
            return { ...item, count: 0 };
          }
          return item;
        })
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Refresh counts to ensure consistency
      loadUnreadCounts();
    }
  };

  // Get unread count with threshold check
  const getUnreadCount = (channelId?: string, dmUserId?: string): number => {
    const item = unreadCounts.find(
      count => 
        (channelId && count.channelId === channelId) || 
        (dmUserId && count.dmUserId === dmUserId)
    );

    return item?.count || 0;
  };

  return {
    unreadCounts,
    markAsRead,
    getUnreadCount
  };
} 