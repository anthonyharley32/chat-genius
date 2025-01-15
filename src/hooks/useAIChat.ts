import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { AIMessage } from '@/types/ai-chat';

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

export function useAIChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const sendMessage = async (message: string): Promise<AIMessage> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
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