'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

type Message = {
  id: string;
  content: string;
  user_id: string;
  channel_id?: string;
  is_direct_message: boolean;
  receiver_id?: string;
  created_at: string;
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
  const [channels, setChannels] = useState<{id: string, name: string}[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const users = useUsers();
  const supabase = createClient();

  const getAvatarUrl = (path: string) => {
    if (!path || path === 'defpropic.jpg') return '/defpropic.jpg';
    return supabase.storage
      .from('avatars')
      .getPublicUrl(path)
      .data.publicUrl;
  };

  // Load channels from database
  useEffect(() => {
    async function loadChannels() {
      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading channels:', error);
        return;
      }

      setChannels(channelsData || []);
      // Set first channel as default if none selected
      if (!currentChannel && channelsData && channelsData.length > 0) {
        setCurrentChannel(channelsData[0].id);
      }
    }

    loadChannels();
  }, []);

  const loadMessages = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    if (selectedUser) {
      query = query
        .eq('is_direct_message', true)
        .or(`user_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`user_id.eq.${selectedUser},receiver_id.eq.${selectedUser}`);
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

      loadMessages();
      
      const channel = supabase
        .channel(`messages:${selectedUser || currentChannel}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          }, 
          async (payload) => {
            // Check if message belongs to current conversation
            if (selectedUser) {
              if (!payload.new.is_direct_message ||
                  (payload.new.user_id !== selectedUser && payload.new.user_id !== user.id) ||
                  (payload.new.receiver_id !== selectedUser && payload.new.receiver_id !== user.id)) {
                return;
              }
            } else {
              if (payload.new.is_direct_message || payload.new.channel_id !== currentChannel) {
                return;
              }
            }
            
            const { data: userData } = await supabase
              .from('users')
              .select('full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              user_id: payload.new.user_id,
              channel_id: payload.new.channel_id,
              is_direct_message: payload.new.is_direct_message,
              receiver_id: payload.new.receiver_id,
              created_at: payload.new.created_at,
              user: { 
                id: payload.new.user_id,
                full_name: userData?.full_name || 'Unknown User',
                avatar_url: userData?.avatar_url || 'defpropic.jpg'
              }
            };

            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [currentChannel, selectedUser, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messageData = selectedUser
        ? {
            content: message.trim(),
            user_id: user.id,
            receiver_id: selectedUser,
            is_direct_message: true
          }
        : {
            content: message.trim(),
            channel_id: currentChannel,
            user_id: user.id,
            is_direct_message: false
          };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select(`
          *,
          user:users!messages_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      
      // Immediately add the new message to the state
      if (data) {
        const newMessage: Message = {
          ...data,
          user: data.user || {
            id: user.id,
            full_name: 'Unknown User',
            avatar_url: 'defpropic.jpg'
          }
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  // Helper function to get current channel name
  const getCurrentChannelName = () => {
    if (selectedUser) {
      const user = users.find(u => u.id === selectedUser);
      return user?.full_name || 'Direct Message';
    }
    const channel = channels.find(c => c.id === currentChannel);
    return channel ? `#${channel.name}` : '';
  };

  console.log('Current messages state:', messages);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        {/* Workspace Name */}
        <div className="p-3 border-b border-gray-700">
          <h1 className="font-bold">ChatGenius</h1>
        </div>
        
        {/* Channels */}
        <div className="p-4">
          <h2 className="text-gray-400 uppercase text-sm mb-2">Channels</h2>
          <ul className="space-y-1">
            {channels.map(channel => (
              <li 
                key={channel.id}
                onClick={() => {
                  setCurrentChannel(channel.id);
                  setSelectedUser(null);
                }}
                className={`cursor-pointer px-2 py-1 rounded ${
                  currentChannel === channel.id && !selectedUser ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                # {channel.name}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Direct Messages */}
        <div className="p-4">
          <h2 className="text-gray-400 uppercase text-sm mb-2">Direct Messages</h2>
          <ul className="space-y-1">
            {users.map(user => (
              <li 
                key={user.id} 
                onClick={() => {
                  setSelectedUser(user.id);
                  setCurrentChannel('');
                }}
                className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${
                  selectedUser === user.id ? 'bg-gray-700' : ''
                }`}
              >
                <span className={`w-2 h-2 ${user.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full inline-block mr-2`}></span>
                {user.full_name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="border-b p-3 font-medium">
          {getCurrentChannelName()}
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start space-x-3">
                <div 
                  className="w-8 h-8 rounded-full bg-gray-300"
                  style={{
                    backgroundImage: msg.user?.avatar_url ? 
                      `url(${getAvatarUrl(msg.user.avatar_url)})` : 
                      'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                ></div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-bold">{msg.user?.full_name || 'Unknown User'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            placeholder={`Message ${getCurrentChannelName()}`}
            className="w-full p-2 rounded-md border"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
