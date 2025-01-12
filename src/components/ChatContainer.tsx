import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageInput } from '@/components/MessageInput';
import { MessageList } from '@/components/MessageList';
import { Message } from '@/types/chat';
import { useMessageSender } from '@/hooks/useMessageSender';
import { useRouter } from 'next/navigation';
import { ThreadView } from '@/components/ThreadView';

interface ChatContainerProps {
  currentChannel?: string;
  selectedUser?: string | null;
  user: any;
  highlightedMessageId?: string | null;
  avatar: string;
}

export function ChatContainer({ currentChannel, selectedUser, user, highlightedMessageId, avatar = '/defpropic.jpg' }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const supabase = createClient();
  const { sendMessage } = useMessageSender();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

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

      // Only load parent messages (not thread replies)
      query = query.is('thread_id', null);

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
      if (!currentChannel && !selectedUser) return;

      // Load initial messages
      loadMessages();
      
      const messageChannel = supabase
        .channel(`messages:${selectedUser || currentChannel}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
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

            console.log('Adding new message to state:', payload.new);

            const newMessage = {
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

            setMessages(prev => {
              // Check if message with this ID already exists
              const messageExists = prev.some(msg => 
                // Check both the actual ID and any temp IDs
                msg.id === payload.new.id || 
                (msg.id.startsWith('temp-') && msg.content === payload.new.content)
              );
              
              if (messageExists) {
                // If it exists, replace temp message with real one
                return prev.map(msg => 
                  (msg.id.startsWith('temp-') && msg.content === payload.new.content)
                    ? newMessage
                    : msg
                );
              }
              return [...prev, newMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    };

    setupSubscription();
  }, [currentChannel, selectedUser, loadMessages, user]);

  const handleThreadOpen = (message: Message) => {
    setActiveThread(message);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full relative" style={{ zIndex: 30 }}>
      <div className={`flex flex-col ${activeThread ? 'w-[60%]' : 'w-full'}`}>
        <MessageList 
          messages={messages}
          onChannelChange={loadMessages}
          isLoading={isLoading}
          highlightedMessageId={highlightedMessageId}
          onThreadSelect={handleThreadOpen}
        />
        <div className="border-t bg-white">
          <MessageInput 
            onSendMessage={async (content, file) => {
              if (!user) return;
              try {
                // Add optimistic message
                const optimisticMessage: Message = {
                  id: `temp-${Date.now()}`,
                  content: content,
                  user_id: user.id,
                  channel_id: currentChannel || undefined,
                  is_direct_message: !!selectedUser,
                  receiver_id: selectedUser || undefined,
                  created_at: new Date().toISOString(),
                  file_url: file ? URL.createObjectURL(file) : null,
                  file_type: file?.type || null,
                  file_name: file?.name || null,
                  user: {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Unknown User',
                    avatar_url: typeof avatar === 'string' ? avatar : '/defpropic.jpg'
                  }
                };
                setMessages(prev => [...prev, optimisticMessage]);

                // Send actual message
                await sendMessage(
                  content,
                  file || null,
                  user.id,
                  currentChannel,
                  selectedUser || undefined
                );

                // Clean up the temporary object URL
                if (file) {
                  URL.revokeObjectURL(optimisticMessage.file_url!);
                }
              } catch (error) {
                console.error('Error sending message:', error);
                // Remove optimistic message on error
                setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
              }
            }}
            channelId={currentChannel || ''}
            user={user}
            selectedUser={selectedUser}
          />
        </div>
      </div>
      {activeThread && (
        <div className="w-[40%]">
          <ThreadView
            parentMessage={activeThread}
            onClose={() => setActiveThread(null)}
            user={user}
          />
        </div>
      )}
    </div>
  );
} 