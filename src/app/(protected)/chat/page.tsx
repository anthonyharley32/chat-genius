'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { MessageInput } from '@/components/MessageInput';
import Sidebar from '@/components/Sidebar';
import { Message } from '@/components/Message';
import { RealtimeChannel } from '@supabase/supabase-js';

type Message = {
  id: string;
  content: string;
  user_id: string;
  channel_id?: string;
  is_direct_message: boolean;
  receiver_id?: string;
  created_at: string;
  image_url?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  users?: { full_name: string };
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const users = useUsers();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const getAvatarUrl = useAvatarUrl();
  const [user, setUser] = useState<any>(null);

  // Add this useEffect to fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Create a memoized avatar component
  const MessageAvatar = memo(({ avatarUrl }: { avatarUrl: string }) => {
    const url = getAvatarUrl(avatarUrl);
    return (
      <div 
        className="w-8 h-8 rounded-full bg-gray-300 bg-cover bg-center"
        style={{
          backgroundImage: `url(${url})`
        }}
      />
    );
  });

  // Fetch channels on component mount
  useEffect(() => {
    async function setupChannels() {
      async function fetchChannels() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('Fetching channels for user:', user.id);
        const { data: channelsData, error } = await supabase
          .from('channels')
          .select(`
            *,
            channel_members!inner(user_id)
          `)
          .eq('channel_members.user_id', user.id)
          .order('name');
        
        if (error) {
          console.error('Error fetching channels:', error);
          return;
        }
        
        if (channelsData) {
          console.log('Channels updated:', channelsData);
          setChannels(channelsData);
        }
      }

      // Initial fetch
      await fetchChannels();

      // Set up real-time subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelsSubscription = supabase
        .channel('channels-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'channels'
          },
          (payload) => {
            console.log('Channel change detected:', payload);
            fetchChannels();
          }
        )
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'channel_members',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Channel member change detected:', payload);
            fetchChannels();
          }
        )
        .subscribe((status) => {
          console.log('Channels subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to channel changes');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel changes');
          }
        });

      return channelsSubscription;
    }

    let subscription: RealtimeChannel;
    setupChannels().then(sub => {
      if (sub) subscription = sub;
    });

    return () => {
      if (subscription) {
        console.log('Cleaning up channels subscription');
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const loadMessages = useCallback(async () => {
    console.log('Loading messages...');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);

    if (!user) {
      console.log('No user found');
      return;
    }

    if (!selectedUser && !currentChannel) {
      console.log('No channel or user selected');
      return;
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        user:users!messages_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: true });

    console.log('Selected user:', selectedUser);
    console.log('Current channel:', currentChannel);

    if (selectedUser) {
      query = query
        .eq('is_direct_message', true)
        .or(`and(user_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(user_id.eq.${selectedUser},receiver_id.eq.${user.id})`);
    } else if (currentChannel) {
      query = query
        .eq('channel_id', currentChannel)
        .eq('is_direct_message', false);
    }

    const { data, error } = await query;
    console.log('Messages data:', data);
    console.log('Query error:', error);

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages((data || []).map(msg => ({
      ...msg,
      user: msg.user || { full_name: 'Unknown User' }
    })));
  }, [currentChannel, selectedUser, supabase]);

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!currentChannel && !selectedUser) {
        console.log('No channel or user selected, skipping message subscription');
        return;
      }

      console.log('Setting up message subscription for:', selectedUser || currentChannel);
      
      // Load initial messages
      loadMessages();
      
      const messageChannel = supabase
        .channel(`messages:${selectedUser || currentChannel}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            console.log('New message received:', payload);
            
            // Check if message belongs to current conversation
            if (selectedUser) {
              if (!payload.new.is_direct_message ||
                  (payload.new.user_id !== selectedUser && payload.new.user_id !== user.id) ||
                  (payload.new.receiver_id !== selectedUser && payload.new.receiver_id !== user.id)) {
                console.log('Message not for current DM conversation');
                return;
              }
            } else if (currentChannel) {
              if (payload.new.is_direct_message || payload.new.channel_id !== currentChannel) {
                console.log('Message not for current channel');
                return;
              }
            }
            
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            if (userError) {
              console.error('Error fetching user data for message:', userError);
              return;
            }

            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              user_id: payload.new.user_id,
              channel_id: payload.new.channel_id,
              is_direct_message: payload.new.is_direct_message,
              receiver_id: payload.new.receiver_id,
              created_at: payload.new.created_at,
              file_url: payload.new.file_url,
              file_type: payload.new.file_type,
              file_name: payload.new.file_name,
              user: { 
                id: payload.new.user_id,
                full_name: userData?.full_name || 'Unknown User',
                avatar_url: userData?.avatar_url || 'defpropic.jpg'
              }
            };

            console.log('Adding new message to state:', newMessage);
            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe((status) => {
          console.log('Messages subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to message changes');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to message changes');
          }
        });

      return () => {
        console.log('Cleaning up messages subscription');
        supabase.removeChannel(messageChannel);
      };
    };

    setupSubscription();
  }, [currentChannel, selectedUser, loadMessages]);

  // Helper function to get current channel name
  const getCurrentChannelName = () => {
    if (selectedUser) {
      const user = users.find(u => u.id === selectedUser);
      return user?.full_name || 'Direct Message';
    }
    const channel = channels.find(c => c.id === currentChannel);
    return channel ? `#${channel.name}` : '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  console.log('Current messages state:', messages);

  useEffect(() => {
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
  }, [currentChannel, selectedUser, supabase]);

  // Create a new channel
  const handleCreateChannel = async (name: string) => {
    try {
      console.log('Creating new channel:', name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when creating channel');
        return;
      }

      // First check if channel already exists
      const { data: existingChannels, error: checkError } = await supabase
        .from('channels')
        .select('id')
        .eq('name', name.toLowerCase());

      if (checkError) {
        console.error('Error checking existing channel:', checkError);
        return;
      }

      if (existingChannels && existingChannels.length > 0) {
        console.error('Channel already exists:', name);
        return;
      }

      console.log('Creating channel in database...');
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: name.toLowerCase(),
          workspace_id: '00000000-0000-0000-0000-000000000000', // Default workspace
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating channel:', error);
        throw error;
      }

      console.log('Channel created:', channel);

      // Get all users
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Create channel members entries for all users
      const channelMembers = allUsers.map(u => ({
        channel_id: channel.id,
        user_id: u.id,
        role: u.id === user.id ? 'owner' : 'member'
      }));

      console.log('Adding all users as channel members...');
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert(channelMembers);

      if (memberError) {
        console.error('Error adding channel members:', memberError);
        throw memberError;
      }

      console.log('Successfully created channel and added all members');
    } catch (error) {
      console.error('Error in handleCreateChannel:', error);
    }
  };

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
        }}
        onUserSelect={(userId) => {
          setSelectedUser(userId);
          setCurrentChannel('');
        }}
        onCreateChannel={handleCreateChannel}
      />
      <div className="flex-1 ml-64">
        <div className="flex flex-col h-full">
          <div className="overflow-y-auto flex-1">
            <div className="px-4">
              {messages.map((msg) => (
                <Message key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t bg-white">
            <MessageInput 
              onSendMessage={async (content, file) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  let imageUrl = null;
                  if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                      .from('message-attachments')
                      .upload(fileName, file);

                    if (uploadError) throw uploadError;
                    
                    imageUrl = supabase.storage
                      .from('message-attachments')
                      .getPublicUrl(fileName).data.publicUrl;
                  }

                  const messageData = selectedUser
                    ? {
                        content: content.trim(),
                        user_id: user.id,
                        receiver_id: selectedUser,
                        is_direct_message: true,
                        image_url: imageUrl
                      }
                    : {
                        content: content.trim(),
                        channel_id: currentChannel,
                        user_id: user.id,
                        is_direct_message: false,
                        image_url: imageUrl
                      };

                  const { error } = await supabase
                    .from('messages')
                    .insert([messageData]);

                  if (error) {
                    console.error('Database error:', error);
                    throw error;
                  }
                  
                } catch (error) {
                  console.error('Error sending message:', error);
                }
              }}
              channelId={currentChannel}
              user={user}
              selectedUser={selectedUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
