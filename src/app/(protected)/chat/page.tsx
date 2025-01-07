'use client';

import { useUsers } from '@/hooks/useUsers';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type Message = {
  id: string;
  content: string;
  user_id: string;
  channel: string;
  created_at: string;
  users: {
    full_name: string;
  };
  user: {
    full_name: string;
  };
};

export default function ChatPage() {
  const users = useUsers();
  const [currentChannel, setCurrentChannel] = useState('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  // Load messages when channel changes
  useEffect(() => {
    console.log('Loading messages for channel:', currentChannel);
    loadMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${currentChannel}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `channel=eq.${currentChannel}`
        }, 
        async (payload) => {
          console.log('New message received:', payload);
          
          // Remove .single() and handle the user lookup similar to loadMessages
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', payload.new.user_id);

          let userName = 'Unknown User';
          if (!usersError && usersData && usersData.length > 0) {
            userName = usersData[0].full_name;
          }

          const newMessage = {
            ...payload.new,
            users: { full_name: userName },
            user: { full_name: userName }
          } as Message;
          
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    console.log('Subscribed to channel:', currentChannel);

    return () => {
      console.log('Unsubscribing from channel:', currentChannel);
      supabase.removeChannel(channel);
    };
  }, [currentChannel]);

  const loadMessages = async () => {
    console.log('Fetching messages...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('channel', currentChannel)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
      return;
    }

    // If there are no messages, set empty array and return
    if (!messagesData || messagesData.length === 0) {
      setMessages([]);
      return;
    }

    // Add explicit typing to the Set
    const userIds = Array.from(new Set<string>(messagesData?.map(msg => msg.user_id) || []));
    
    // Handle empty userIds array
    if (userIds.length === 0) {
      setMessages([]);
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds);

    // Type the userMap properly
    const userMap: Record<string, { id: string; full_name: string }> = {};
    
    // Safely populate userMap even if usersData is null or there's an error
    if (!usersError && usersData) {
      usersData.forEach(user => {
        userMap[user.id] = user;
      });
    }

    console.log('Loaded messages:', messagesData);
    setMessages(messagesData.map(msg => ({
      ...msg,
      users: userMap[msg.user_id] || { full_name: 'Unknown User' },
      user: {
        full_name: userMap[msg.user_id]?.full_name || 'Unknown User'
      }
    })));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .insert({
          content: message,
          channel: currentChannel,
          user_id: user.id
        });

      if (error) throw error;
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const channels = [
    { id: 'general', name: 'general' },
    { id: 'random', name: 'random' }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        {/* Workspace Name */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold">Workspace Name</h1>
        </div>
        
        {/* Channels */}
        <div className="p-4">
          <h2 className="text-gray-400 uppercase text-sm mb-2">Channels</h2>
          <ul className="space-y-1">
            {channels.map(channel => (
              <li 
                key={channel.id}
                onClick={() => setCurrentChannel(channel.id)}
                className={`cursor-pointer px-2 py-1 rounded ${
                  currentChannel === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'
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
              <li key={user.id} className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded">
                <span className={`w-2 h-2 ${user.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full inline-block mr-2`}></span>
                {user.full_name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel Header */}
        <div className="border-b px-6 py-2">
          <h2 className="text-xl font-bold"># {currentChannel}</h2>
          <p className="text-sm text-gray-500">Channel description goes here</p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-300"></div>
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="font-bold">{msg.user.full_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message #${currentChannel}`}
              className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
