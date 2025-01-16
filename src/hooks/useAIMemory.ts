import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AIChatHistory, AIAvatarSettings, CreateAIChatHistoryParams } from '@/types/ai-memory';
import { useUser } from './useUser';

export function useAIMemory(targetUserId?: string) {
  const [history, setHistory] = useState<AIChatHistory[]>([]);
  const [avatarSettings, setAvatarSettings] = useState<AIAvatarSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { user } = useUser();

  // Fetch chat history for the current user and target user
  const fetchHistory = useCallback(async () => {
    if (!user?.id || !targetUserId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('*')
        .or(`and(user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},target_user_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map citation_references back to references
      const mappedData = data?.map(item => ({
        ...item,
        references: item.citation_references,
        citation_references: undefined
      })) || [];
      
      setHistory(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chat history');
      console.error('Error fetching chat history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, targetUserId, supabase]);

  // Add a new message to history
  const addMessage = useCallback(async (params: Omit<CreateAIChatHistoryParams, 'user_id' | 'target_user_id'>) => {
    if (!user?.id || !targetUserId) return null;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_chat_history')
        .insert([{
          user_id: user.id,
          target_user_id: targetUserId,
          content: params.content,
          role: params.role,
          citations: params.citations,
          citation_references: params.references
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add message');
      console.error('Error adding message:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, targetUserId, supabase]);

  // Fetch avatar settings for the target user
  const fetchAvatarSettings = useCallback(async () => {
    if (!targetUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_avatar_settings')
        .select()
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching avatar settings:', error);
        setAvatarSettings(null);
        return;
      }
      setAvatarSettings(data);
    } catch (err) {
      console.error('Error fetching avatar settings:', err);
      setAvatarSettings(null);
    }
  }, [targetUserId, supabase]);

  // Update avatar settings (only for the current user)
  const updateAvatarSettings = useCallback(async (instructions: string) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_avatar_settings')
        .upsert({
          user_id: user.id,
          instructions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating avatar settings:', error);
        return null;
      }
      setAvatarSettings(data);
      return data;
    } catch (err) {
      console.error('Error updating avatar settings:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  // Load initial data and set up real-time subscription
  useEffect(() => {
    if (!targetUserId || !user?.id) return;

    fetchHistory();
    fetchAvatarSettings();

    // Set up real-time subscriptions
    const chatChannel = supabase
      .channel(`ai_chat_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_chat_history',
          filter: `target_user_id=eq.${targetUserId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    const avatarChannel = supabase
      .channel(`ai_avatar_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_avatar_settings',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          fetchAvatarSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(avatarChannel);
    };
  }, [targetUserId, user?.id, fetchHistory, fetchAvatarSettings, supabase]);

  return {
    history,
    avatarSettings,
    isLoading,
    error,
    addMessage,
    updateAvatarSettings,
    refreshHistory: fetchHistory,
  };
} 