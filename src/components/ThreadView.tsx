import { useState, useEffect } from 'react';
import { Message as MessageComponent } from '@/components/Message';
import { Message } from '@/types/chat';
import { createClient } from '@/utils/supabase/client';
import { X } from 'lucide-react';
import { MessageInput } from './MessageInput';

interface ThreadViewProps {
  parentMessage: Message | null;
  onClose: () => void;
  user: any;
}

export function ThreadView({ parentMessage, onClose, user }: ThreadViewProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!parentMessage) return;

    const loadReplies = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            user:users!messages_user_id_fkey(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('thread_id', parentMessage.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setReplies((data || []).map(msg => ({
          ...msg,
          user: msg.user || { full_name: 'Unknown User' }
        })));
      } catch (error) {
        console.error('Error loading replies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReplies();

    // Subscribe to new replies
    const channel = supabase
      .channel(`thread:${parentMessage.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessage.id}`
        },
        async (payload) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (userError) {
            console.error('Error fetching user data for reply:', userError);
            return;
          }

          const newReply: Message = {
            id: payload.new.id,
            content: payload.new.content,
            user_id: payload.new.user_id,
            channel_id: payload.new.channel_id,
            is_direct_message: payload.new.is_direct_message,
            receiver_id: payload.new.receiver_id,
            created_at: payload.new.created_at,
            file_url: payload.new.file_url || undefined,
            file_type: payload.new.file_type || undefined,
            file_name: payload.new.file_name || undefined,
            thread_id: payload.new.thread_id,
            user: {
              id: payload.new.user_id,
              full_name: userData?.full_name || 'Unknown User',
              avatar_url: userData?.avatar_url || 'defpropic.jpg'
            }
          };

          setReplies(prev => [...prev, newReply]);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage]);

  if (!parentMessage) return null;

  return (
    <div className="flex flex-col h-full border-l">
      {/* Thread Header */}
      <div className="p-4 border-b flex justify-between items-center bg-white">
        <h2 className="text-lg font-semibold">Thread</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close thread"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b bg-gray-50">
        <MessageComponent
          message={parentMessage}
          isConsecutive={false}
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            replies.map((reply, index) => (
              <MessageComponent
                key={reply.id}
                message={reply}
                isConsecutive={
                  index > 0 &&
                  replies[index - 1].user.id === reply.user.id &&
                  new Date(reply.created_at).getTime() - new Date(replies[index - 1].created_at).getTime() < 5 * 60 * 1000
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="border-t bg-white">
        <MessageInput
          onSendMessage={async (content, file) => {
            if (!user) return;
            try {
              const { error } = await supabase
                .from('messages')
                .insert({
                  content,
                  user_id: user.id,
                  channel_id: parentMessage.channel_id,
                  is_direct_message: parentMessage.is_direct_message,
                  receiver_id: parentMessage.receiver_id,
                  thread_id: parentMessage.id
                });

              if (error) throw error;
            } catch (error) {
              console.error('Error sending reply:', error);
            }
          }}
          channelId={parentMessage.channel_id || ''}
          user={user}
          selectedUser={parentMessage.receiver_id || null}
        />
      </div>
    </div>
  );
} 