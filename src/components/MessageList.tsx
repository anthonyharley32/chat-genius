import { useEffect, useRef } from 'react';
import { Message as MessageComponent } from '@/components/Message';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onChannelChange?: () => void;
  onNewMessage?: () => void;
}

export function MessageList({ messages, isLoading = false, onChannelChange, onNewMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial channel change - instant scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
    onChannelChange?.();
  }, [onChannelChange]);

  // New messages - smooth scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      }, 200);
      onNewMessage?.();
    }
  }, [messages, onNewMessage]);

  return (
    <div className="overflow-y-auto flex-1">
      <div className="px-4 flex flex-col">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageComponent 
              key={msg.id} 
              message={msg}
              isConsecutive={
                index > 0 && 
                messages[index - 1].user.id === msg.user.id &&
                // Messages within 5 minutes are considered consecutive
                new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() < 5 * 60 * 1000
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 