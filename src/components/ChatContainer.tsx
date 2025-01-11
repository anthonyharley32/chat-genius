import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageInput } from '@/components/MessageInput';
import { MessageList } from '@/components/MessageList';
import { Message } from '@/types/chat';
import { useMessageSender } from '@/hooks/useMessageSender';

interface ChatContainerProps {
  currentChannel: string;
  selectedUser: string | null;
  user: any;
}

export function ChatContainer({ currentChannel, selectedUser, user }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const { sendMessage } = useMessageSender();

  const loadMessages = useCallback(async () => {
    if (!user) return;
    if (!selectedUser && !currentChannel) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          user:users!messages_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: true });

      if (selectedUser) {
        query = query
          .eq('is_direct_message', true)
          .or(`and(user_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(user_id.eq.${selectedUser},receiver_id.eq.${user.id})`);
      } else if (currentChannel) {
        query = query
          .eq('channel_id', currentChannel)
          .eq('is_direct_message', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages((data || []).map(msg => ({
        ...msg,
        user: msg.user || { full_name: 'Unknown User' }
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentChannel, selectedUser, user]);

  useEffect(() => {
    const setupSubscription = async () => {
      if (!user) return;
      if (!currentChannel && !selectedUser) return;

      // Load initial messages
      loadMessages();
      
      const messageChannel = supabase
        .channel(`messages:${selectedUser || currentChannel}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            // Check if message belongs to current conversation
            if (selectedUser) {
              if (!payload.new.is_direct_message ||
                  (payload.new.user_id !== selectedUser && payload.new.user_id !== user.id) ||
                  (payload.new.receiver_id !== selectedUser && payload.new.receiver_id !== user.id)) {
                return;
              }
            } else if (currentChannel) {
              if (payload.new.is_direct_message || payload.new.channel_id !== currentChannel) {
                return;
              }
            }
            
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            if (userError) {
              console.error('Error fetching user data for message:', userError);
              return;
            }

            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              user_id: payload.new.user_id,
              channel_id: payload.new.channel_id,
              is_direct_message: payload.new.is_direct_message,
              receiver_id: payload.new.receiver_id,
              created_at: payload.new.created_at,
              file_url: payload.new.file_url,
              file_type: payload.new.file_type,
              file_name: payload.new.file_name,
              user: { 
                id: payload.new.user_id,
                full_name: userData?.full_name || 'Unknown User',
                avatar_url: userData?.avatar_url || 'defpropic.jpg'
              }
            };

            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    };

    setupSubscription();
  }, [currentChannel, selectedUser, loadMessages, user]);

  return (
    <div className="flex flex-col h-full relative" style={{ zIndex: 30 }}>
      <MessageList 
        messages={messages}
        onChannelChange={loadMessages}
        isLoading={isLoading}
      />
      <div className="border-t bg-white">
        <MessageInput 
          onSendMessage={async (content, file) => {
            if (!user) return;
            try {
              await sendMessage(
                content,
                file || null,
                user.id,
                currentChannel,
                selectedUser || undefined
              );
            } catch (error) {
              console.error('Error sending message:', error);
            }
          }}
          channelId={currentChannel}
          user={user}
          selectedUser={selectedUser}
        />
      </div>
    </div>
  );
} 