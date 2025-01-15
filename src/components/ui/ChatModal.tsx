'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { AIMessage } from '@/types/ai-chat';
import { useAIChat } from '@/hooks/useAIChat';
import { useUser } from '@/hooks/useUser';
import ReactMarkdown from 'react-markdown';

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div 
        className="fixed inset-0 bg-black/20" 
        onClick={onClose}
      />
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
      >
        <div 
          className="bg-white rounded-lg shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto w-[75vw]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col h-[80vh]">
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
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        className="prose prose-sm max-w-none dark:prose-invert"
                        components={{
                          p: ({ children }) => <p className="whitespace-pre-wrap mb-4 last:mb-0">{children}</p>,
                          code: ({ children }) => (
                            <code className="bg-gray-200 dark:bg-gray-800 rounded px-1 py-0.5">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-200 dark:bg-gray-800 rounded-md p-3 overflow-x-auto mb-4">{children}</pre>
                          ),
                          ul: ({ children }) => <ul className="list-disc list-inside mb-4">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-4">{children}</blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-4">
                              <table className="min-w-full border-collapse border border-gray-300">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-gray-300 px-4 py-2 bg-gray-200">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-300 px-4 py-2">{children}</td>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
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
        </div>
      </div>
    </>
  );

  return createPortal(
    modalContent,
    document.body
  );
} 