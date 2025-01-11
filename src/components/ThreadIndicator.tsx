import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare } from 'lucide-react';

interface ThreadIndicatorProps {
  messageId: string;
  onClick?: () => void;
}

export function ThreadIndicator({ messageId, onClick }: ThreadIndicatorProps) {
  const [replyCount, setReplyCount] = useState(0);
  const [latestReply, setLatestReply] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadThreadInfo = async () => {
      // Get reply count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', messageId);

      setReplyCount(count || 0);

      // Get latest reply timestamp
      if (count && count > 0) {
        const { data } = await supabase
          .from('messages')
          .select('created_at')
          .eq('thread_id', messageId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setLatestReply(data.created_at);
        }
      }
    };

    loadThreadInfo();

    // Subscribe to thread changes
    const channel = supabase
      .channel(`thread-indicator:${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${messageId}`
      }, () => {
        loadThreadInfo();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  if (replyCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mt-1"
    >
      <MessageSquare size={12} />
      <span>{replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
      {latestReply && (
        <span className="ml-1">
          • Last reply {new Date(latestReply).toLocaleDateString()}
        </span>
      )}
    </button>
  );
} 