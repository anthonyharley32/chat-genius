import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { AIMessage } from '@/types/ai-chat';
import { useAIMemory } from './useAIMemory';

interface AIResponse {
  response: string;
  citations?: {
    id: string;
    messageId: string;
    similarityScore: number;
    previewText: string;
    metadata: {
      timestamp: string;
      userId: string;
      userName: string;
    }
  }[];
  references?: {
    citationId: string;
    inlinePosition: number;
    referenceText: string;
  }[];
}

export function useAIChat(targetUserId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const { addMessage, avatarSettings } = useAIMemory(targetUserId);

  const sendMessage = async (message: string): Promise<AIMessage> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Store user message in history
      await addMessage({
        content: message,
        role: 'user'
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: user.id,
          avatar_instructions: avatarSettings?.instructions || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      // Store AI response in history
      await addMessage({
        content: data.response,
        role: 'assistant'
      });

      return {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        references: data.references,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error
  };
} 