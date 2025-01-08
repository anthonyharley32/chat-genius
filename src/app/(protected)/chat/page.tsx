'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { MessageInput } from '@/components/MessageInput';

type Message = {
  id: string;
  content: string;
  user_id: string;
  channel_id?: string;
  is_direct_message: boolean;
  receiver_id?: string;
  created_at: string;
  image_url?: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const getAvatarUrl = useAvatarUrl();

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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
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
        <div className="flex-1 overflow-y-auto px-4 pt-4">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              <div className="flex items-start space-x-3">
                <MessageAvatar 
                  avatarUrl={msg.user?.avatar_url || '/defpropic.jpg'} 
                />
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="font-bold">{msg.user?.full_name || 'Unknown User'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.image_url && (
                    <img 
                      src={msg.image_url} 
                      alt="Message attachment" 
                      className="mt-2 max-w-sm rounded-lg"
                    />
                  )}
                  {msg.content && (
                    <p className="mt-2">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {/* Original input - commented out
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={handleMessageChange}
              placeholder={`Message ${getCurrentChannelName()}`}
              className="flex-1 p-2 border rounded-md"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500"
            >
              Send
            </button>
          </form>
        </div>
        */}
        
        {/* New MessageInput component */}
        <MessageInput onSendMessage={async (content, file)=> {
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

            const { data, error } = await supabase
              .from('messages')
              .insert([messageData])
              .select(`
                *,
                user:users!messages_user_id_fkey(
                  id,
                  full_name,
                  avatar_url
                )
              `);

            if (error) {
              console.error('Database error:', error);
              throw error;
            }
            
            console.log('Message sent successfully:', data);
            
            // Add the new message to the messages state
            if (data && data[0]) {
              setMessages(prev => [...prev, data[0]]);
            }
          } catch (error) {
            console.error('Error sending message:', error);
          }
        }} />
      </div>
    </div>
  );
}
