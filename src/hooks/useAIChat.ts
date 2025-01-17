import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { AIMessage } from '@/types/ai-chat';
import { useAIMemory } from './useAIMemory';
import { CreateAIChatHistoryParams } from '@/types/ai-memory';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      channelId?: string;
      channelName?: string;
      isDirectMessage: boolean;
      receiverId?: string;
      receiverName?: string;
    }
  }[];
  references?: {
    citationId: string;
    inlinePosition: number;
    referenceText: string;
  }[];
}

interface AIAvatarSettings {
  name: string;
  instructions?: string;
}

export function useAIChat(targetUserId: string) {
  const { user } = useUser();
  const { addMessage, avatarSettings } = useAIMemory(targetUserId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string>('AI Assistant');

  useEffect(() => {
    const fetchTargetUser = async () => {
      if (!targetUserId) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', targetUserId)
        .single();
        
      if (data?.full_name) {
        setTargetUserName(data.full_name);
      }
    };
    
    fetchTargetUser();
  }, [targetUserId]);

  const sendMessage = async (message: string): Promise<AIMessage> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Debug - Sending message with:', {
        targetUserName,
        avatarSettings,
        message
      });

      await addMessage({
        content: message,
        role: 'user'
      });

      const requestBody = {
        message,
        avatar_name: targetUserName,
        avatar_instructions: avatarSettings?.instructions || null
      };

      console.log('Debug - Request body:', requestBody);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Debug - API Error:', errorData);
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      // Add debug logging
      console.log('Debug - AI Response:', {
        content: data.response,
        citations: data.citations,
        references: data.references
      });
      
      // Store AI response in history
      const aiMessage: Omit<CreateAIChatHistoryParams, 'user_id' | 'target_user_id'> = {
        content: data.response,
        role: 'assistant' as const,
        citations: data.citations,
        references: data.references
      };
      await addMessage(aiMessage);

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