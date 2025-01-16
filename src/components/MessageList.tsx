import { useEffect, useRef } from 'react';
import { Message as MessageComponent } from '@/components/Message';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onChannelChange?: () => void;
  onNewMessage?: () => void;
  highlightedMessageId?: string | null;
  onThreadSelect?: (message: Message) => void;
  user?: any;
}

export function MessageList({ 
  messages, 
  isLoading = false, 
  onChannelChange, 
  onNewMessage, 
  highlightedMessageId,
  onThreadSelect,
  user
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial message load - instant scroll
  useEffect(() => {
    // Scroll to bottom when messages first load or change, unless we're highlighting a specific message
    if (messages.length > 0 && !highlightedMessageId) {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [messages, highlightedMessageId]);

  // Initial channel change - instant scroll
  useEffect(() => {
    onChannelChange?.();
  }, [onChannelChange]);

  // New messages - smooth scroll
  useEffect(() => {
    // Only auto-scroll for new messages if we're not navigating to a specific message
    // AND if the new message is from the current user (to avoid scrolling when loading history)
    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage?.user?.id === user?.id;
    
    if (messages.length > 0 && !highlightedMessageId && isNewMessage) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
      
      // Additional scroll after images load
      if (lastMessage.image_url || (lastMessage.file_url && lastMessage.file_type?.startsWith('image/'))) {
        const img = new Image();
        img.onload = () => {
          if (!highlightedMessageId) {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: "smooth",
              block: "end"
            });
          }
        };
        img.src = lastMessage.image_url || lastMessage.file_url || '';
      }
      
      onNewMessage?.();
    }
  }, [messages, onNewMessage, highlightedMessageId]);

  return (
    <div className="overflow-y-auto flex-1">
      <div className="px-4 flex flex-col mb-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageComponent 
              key={msg.id} 
              message={msg}
              highlightedMessageId={highlightedMessageId}
              isConsecutive={
                index > 0 && 
                messages[index - 1].user.id === msg.user.id &&
                // Messages within 5 minutes are considered consecutive
                new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() < 5 * 60 * 1000
              }
              onThreadSelect={onThreadSelect}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 