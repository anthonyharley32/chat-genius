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
      setHistory(data || []);
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
          role: params.role
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local history immediately
      setHistory(prev => [...prev, data]);
      
      // Refresh history to ensure consistency
      fetchHistory();
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add message');
      console.error('Error adding message:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, targetUserId, supabase, fetchHistory]);

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
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setAvatarSettings(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar settings');
      console.error('Error updating avatar settings:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  // Load initial data
  useEffect(() => {
    if (targetUserId) {
      fetchHistory();
      fetchAvatarSettings();
    }
  }, [targetUserId, fetchHistory, fetchAvatarSettings]);

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