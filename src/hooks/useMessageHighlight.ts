import { useEffect, useRef } from 'react';

export function useMessageHighlight(messageId: string | null) {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageId && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight animation
      messageRef.current.classList.add('highlight-message');
      // Remove highlight after animation
      setTimeout(() => {
        messageRef.current?.classList.remove('highlight-message');
      }, 2000);
    }
  }, [messageId]);

  return messageRef;
} 