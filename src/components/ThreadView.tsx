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
    console.log('ThreadView: Parent message changed:', parentMessage);
    if (!parentMessage) return;

    const loadReplies = async () => {
      setIsLoading(true);
      try {
        console.log('ThreadView: Loading replies for thread:', parentMessage.id);
        
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

        console.log('ThreadView: Loaded replies:', data);

        setReplies((data || []).map(msg => ({
          ...msg,
          user: msg.user || { full_name: 'Unknown User' }
        })));
      } catch (error) {
        console.error('ThreadView: Error loading replies:', error);
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
          console.log('ThreadView: New reply received:', payload);

          // Check if message already exists in replies
          if (replies.some(reply => reply.id === payload.new.id)) {
            console.log('ThreadView: Reply already exists, skipping:', payload.new.id);
            return;
          }

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (userError) {
            console.error('ThreadView: Error fetching user data for reply:', userError);
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

          console.log('ThreadView: Adding new reply to state:', newReply);
          setReplies(prev => [...prev, newReply]);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage]);

  const sendThreadReply = async (content: string, file: File | null) => {
    if (!user || !parentMessage) return;
    
    try {
      console.log('Sending thread reply:', {
        parentMessageId: parentMessage.id,
        content,
        userId: user.id
      });

      const messageData = {
        content,
        user_id: user.id,
        channel_id: parentMessage.channel_id,
        is_direct_message: parentMessage.is_direct_message,
        receiver_id: parentMessage.receiver_id,
        thread_id: parentMessage.id
      };

      console.log('Inserting thread message:', messageData);

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messageData);

      if (insertError) throw insertError;

      // No need to add to state here - subscription will handle it
      console.log('Thread reply sent successfully');

    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  };

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
          onSendMessage={sendThreadReply}
          channelId={parentMessage.channel_id || ''}
          user={user}
          selectedUser={parentMessage.receiver_id || null}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  );
} 