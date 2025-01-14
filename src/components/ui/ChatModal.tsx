'use client';

import { Modal } from './Modal';
import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import { streamChatCompletion } from '@/lib/openai';
import { AIMessage } from '@/types/ai-chat';
import { Answer } from './Answer';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  userName?: string;
}

export function ChatModal({ isOpen, onClose, userName = "User" }: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastStreamedMessageId, setLastStreamedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear lastStreamedMessageId when modal opens/closes
  useEffect(() => {
    setLastStreamedMessageId(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: message,
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const stream = await streamChatCompletion([
        {
          role: 'system',
          content: `You are having a conversation with ${userName}. Be helpful and friendly.`
        },
        ...messages,
        userMessage
      ]);

      const newMessageId = Date.now().toString();
      setLastStreamedMessageId(newMessageId);
      
      setMessages(prev => [...prev, {
        id: newMessageId,
        role: 'assistant',
        content: stream.choices[0].delta.content
      }]);
      
    } catch (error) {
      console.error('Error in chat:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachment = () => {
    // Handle attachment here
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col h-[80vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{userName}'s AI Chat</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close chat"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Chat Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Answer 
                      text={msg.content} 
                      isNew={!!msg.id && msg.id === lastStreamedMessageId} 
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area - ChatGPT Style */}
          <div className="relative px-4 py-2 sm:px-4 sm:py-4 md:px-6 bg-gradient-to-t from-white via-white to-transparent">
            <div className="relative max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex flex-col w-full py-1 flex-grow md:py-2 md:pl-4 relative border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.10)]">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Chat with ${userName.split(' ')[0]}'s Avatar`}
                  className="w-full resize-none bg-transparent pt-1 pb-8 pl-10 pr-12 focus:ring-0 focus-visible:ring-0 dark:bg-transparent max-h-32 overflow-y-auto focus:outline-none text-black"
                  rows={1}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAttachment}
                  className="absolute left-2 bottom-2.5 p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg"
                  aria-label="Add attachment"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  className="absolute right-2 bottom-2.5 p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:hover:bg-transparent dark:hover:bg-gray-900 dark:hover:text-gray-400 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-6 w-6 stroke-2" />
                </button>
              </form>
              <div className="px-2 py-2 text-center text-xs text-gray-400">
                ChatGPT may make mistakes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
} 