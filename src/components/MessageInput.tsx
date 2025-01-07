'use client';

import { useState } from 'react';

type MessageInputProps = {
  onSendMessage: (message: string) => void;
};

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      <div className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:border-blue-500"
        />
        <button 
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-500"
        >
          Send
        </button>
      </div>
    </form>
  );
} 