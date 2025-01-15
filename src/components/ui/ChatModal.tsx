'use client';

import { Modal } from './Modal';
import { useState, useRef, useEffect, use } from 'react';
import { ArrowUp } from 'lucide-react';
import { AIMessage } from '@/types/ai-chat';
import { useAIChat } from '@/hooks/useAIChat';
import { useUser } from '@/hooks/useUser';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  userName?: string;
}

export function ChatModal({ isOpen, onClose, userName = "User" }: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading, error } = useAIChat();
  const { user } = useUser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    if (!user) {
      console.error('No user found');
      return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const aiResponse = await sendMessage(message);
      const assistantMessage: AIMessage = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: aiResponse,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error getting AI response:', err);
      const errorMessage: AIMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[80vh] max-w-2xl mx-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{userName.split(' ')[0]}'s AI Assistant</h2>
          <p className="text-sm text-gray-500">Ask me anything about my workspace</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!user && (
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded">
              Please sign in to use the chat.
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={user ? "Type a message..." : "Please sign in to chat"}
              className="flex-1 p-2 border rounded-lg resize-none"
              rows={1}
              disabled={!user}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim() || !user}
              className="p-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-6 h-6" />
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 