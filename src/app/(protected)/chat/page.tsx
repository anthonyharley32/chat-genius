'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/Sidebar';
import { ChatContainer } from '@/components/ChatContainer';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const users = useUsers();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch channels on component mount
  useEffect(() => {
    if (!user) return;

    const fetchChannels = async () => {
      const { data: channels } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (channels) {
        setChannels(channels);
      }
    };

    fetchChannels();

    // Subscribe to channel changes
    const channelSubscription = supabase
      .channel('channel_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'channels' 
        }, 
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [user]);

  // Load initial channel
  useEffect(() => {
    if (!user) return;

    const loadInitialChannel = async () => {
      const { data: channels } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (channels) {
        setCurrentChannel(channels.id);
      }
    };

    if (!currentChannel && !selectedUser) {
      loadInitialChannel();
    }
  }, [currentChannel, selectedUser, user]);

  // Create a new channel
  const handleCreateChannel = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if channel already exists
      const { data: existingChannels, error: checkError } = await supabase
        .from('channels')
        .select('id')
        .eq('name', name.toLowerCase());

      if (checkError) throw checkError;
      if (existingChannels?.length > 0) return;

      const { error } = await supabase
        .from('channels')
        .insert({
          name: name.toLowerCase(),
          workspace_id: '00000000-0000-0000-0000-000000000000', // Default workspace
          created_by: user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleNavigateToMessage = (messageId: string, channelId: string | null, userId: string | null) => {
    if (channelId) {
      setCurrentChannel(channelId);
      setSelectedUser(null);
    } else if (userId) {
      setSelectedUser(userId);
      setCurrentChannel('');
    }
    setHighlightedMessageId(messageId);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] fixed top-16 w-full">
      <Sidebar
        channels={channels}
        users={users}
        currentChannel={currentChannel}
        selectedUser={selectedUser}
        onChannelSelect={(channelId) => {
          setCurrentChannel(channelId);
          setSelectedUser(null);
          setHighlightedMessageId(null);
        }}
        onUserSelect={(userId) => {
          setSelectedUser(userId);
          setCurrentChannel('');
          setHighlightedMessageId(null);
        }}
        onCreateChannel={handleCreateChannel}
        onNavigateToMessage={handleNavigateToMessage}
      />
      <div className="flex-1 ml-56">
        <ChatContainer 
          currentChannel={currentChannel}
          selectedUser={selectedUser}
          user={user}
          highlightedMessageId={highlightedMessageId}
        />
      </div>
    </div>
  );
}
