'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/Sidebar';
import { ChatContainer } from '@/components/ChatContainer';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

export default function ChatPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const users = useUsers();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const avatar = useUserStore((state) => state.avatar);

  // Function to update URL with current selection
  const updateURL = (type: 'channel' | 'dm', id: string | null) => {
    const params = new URLSearchParams();
    if (type === 'channel' && id) {
      params.set('type', 'channel');
      params.set('channelId', id);
    } else if (type === 'dm' && id) {
      params.set('type', 'dm');
      params.set('userId', id);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Effect to read URL params on mount and after auth
  useEffect(() => {
    if (!user) return;

    const type = searchParams.get('type');
    const channelId = searchParams.get('channelId');
    const userId = searchParams.get('userId');

    if (type === 'channel' && channelId) {
      setCurrentChannel(channelId);
      setSelectedUser(null);
    } else if (type === 'dm' && userId) {
      setSelectedUser(userId);
      setCurrentChannel('');
    } else {
      // Only load initial channel if no URL params exist
      loadInitialChannel();
    }
  }, [searchParams, user]);

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

  // Move loadInitialChannel to a separate function
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

  // Update the channel selection handler
  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
    setSelectedUser(null);
    setHighlightedMessageId(null);
    updateURL('channel', channelId);
  };

  // Update the user selection handler
  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setCurrentChannel('');
    setHighlightedMessageId(null);
    updateURL('dm', userId);
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
        onChannelSelect={handleChannelSelect}
        onUserSelect={handleUserSelect}
        onCreateChannel={handleCreateChannel}
        onNavigateToMessage={handleNavigateToMessage}
        currentUserId={user.id}
      />
      <div className="flex-1 ml-56">
        <ChatContainer 
          currentChannel={currentChannel}
          selectedUser={selectedUser}
          user={user}
          highlightedMessageId={highlightedMessageId}
          avatar={avatar}
        />
      </div>
    </div>
  );
}
