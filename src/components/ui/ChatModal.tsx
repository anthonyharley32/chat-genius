'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Maximize2, Minimize2, X } from 'lucide-react';
import { AIMessage } from '@/types/ai-chat';
import { Citation, CitationReference } from '@/types/citations';
import { useAIChat } from '@/hooks/useAIChat';
import { useUser } from '@/hooks/useUser';
import { useMessageHighlight } from '@/hooks/useMessageHighlight';
import ReactMarkdown from 'react-markdown';
import { MessageHighlight } from '@/components/ui/MessageHighlight';
import { CitationComponent } from '@/components/ui/CitationComponent';
import { useRouter } from 'next/navigation';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  userName?: string;
}

function formatMessageWithCitations(content: string, references: CitationReference[], onCitationClick: (citationId: string) => void) {
  // Create a mapping of reference numbers to citation IDs
  const refToCitationMap = new Map(
    references.map(ref => [ref.referenceText, ref.citationId])
  );
  
  // Create a sequential mapping for display
  const uniqueRefs = Array.from(new Set(
    content.match(/\{ref:\d+\}/g)?.map(ref => ref.match(/\d+/)?.[0]).filter(Boolean) || []
  ));
  const displayNumberMap = new Map(
    uniqueRefs.map((ref, index) => [ref, index + 1])
  );
  
  // Split content at citation markers
  const parts = content.split(/(\{ref:\d+\})/);
  
  return parts.map((part, index) => {
    // Check if this part is a citation marker
    const match = part.match(/\{ref:(\d+)\}/);
    if (match) {
      const refNumber = match[1];
      const citationId = refToCitationMap.get(refNumber);
      const displayNumber = displayNumberMap.get(refNumber);
      
      if (citationId && displayNumber) {
        return (
          <button
            key={index}
            onClick={() => {
              if (citationId) {
                onCitationClick(citationId);
              }
            }}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-blue-100 dark:bg-blue-900/30 
                     text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/30 
                     transition-colors duration-200 text-sm"
            aria-label={`View citation ${displayNumber}`}
          >
            [{displayNumber}]
          </button>
        );
      }
    }
    return <span key={index}>{part}</span>;
  });
}

function getUsedCitations(content: string, citations: Citation[], references: CitationReference[]) {
  console.log('Debug - Content:', content);
  console.log('Debug - Original Citations:', citations);
  console.log('Debug - Original References:', references);

  // Find all citation markers in the content in order of appearance
  const markers = content.match(/\{ref:\d+\}/g) || [];
  const usedRefNumbers = markers
    .map(marker => {
      const match = marker.match(/\d+/);
      return match ? match[0] : null;
    })
    .filter((ref): ref is string => ref !== null);
  
  console.log('Debug - Citation markers in order:', markers);
  console.log('Debug - Used reference numbers in order:', usedRefNumbers);
  
  // Create sequential display numbers while preserving original order
  const uniqueRefs = Array.from(new Set(usedRefNumbers));
  const displayNumberMap = new Map(
    uniqueRefs.map((ref, index) => [ref, (index + 1).toString()])
  );
  
  console.log('Debug - Display number mapping:', Object.fromEntries(displayNumberMap));
  
  // Track citation order based on first appearance in text
  const citationOrder = usedRefNumbers
    .map(refNum => {
      const ref = references.find(r => r.referenceText === refNum);
      const displayNumber = displayNumberMap.get(refNum);
      return ref && displayNumber ? { refNum, citationId: ref.citationId, displayNumber } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  console.log('Debug - Citation order:', citationOrder);

  // Create new references maintaining the order
  const usedCitationIds = new Set<string>();
  const newReferences: CitationReference[] = [];
  
  citationOrder.forEach(({ refNum, citationId, displayNumber }) => {
    if (!usedCitationIds.has(citationId)) {
      usedCitationIds.add(citationId);
      const originalRef = references.find(ref => ref.citationId === citationId);
      if (originalRef) {
        newReferences.push({
          ...originalRef,
          referenceText: displayNumber
        });
      }
    }
  });

  console.log('Debug - New references:', newReferences);
  
  // Order citations based on their first appearance in the text
  const orderedCitations = citations
    .filter(citation => usedCitationIds.has(citation.id))
    .sort((a, b) => {
      const aIndex = citationOrder.findIndex(c => c.citationId === a.id);
      const bIndex = citationOrder.findIndex(c => c.citationId === b.id);
      return aIndex - bIndex;
    });
  
  console.log('Debug - Final ordered citations:', orderedCitations);
  
  return {
    citations: orderedCitations,
    references: newReferences
  };
}

export function ChatModal({ isOpen, onClose, userName = "User" }: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<{
    messageId: string;
    citationId: string;
  } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messageRef = useMessageHighlight(highlightedMessageId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading, error } = useAIChat();
  const { user } = useUser();
  const router = useRouter();

  const handleNavigateToMessage = (messageId: string, channelId: string | null, userId: string | null) => {
    if (channelId) {
      // Navigate to channel
      router.push(`/chat?type=channel&channelId=${channelId}`);
    } else if (userId) {
      // Navigate to DM
      router.push(`/chat?type=dm&userId=${userId}`);
    }
    setHighlightedMessageId(messageId);
  };

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

  const handleCitationClick = (citationId: string, messageId: string) => {
    if (highlightedCitation?.messageId === messageId && highlightedCitation?.citationId === citationId) {
      setHighlightedCitation(null);
    } else {
      setHighlightedCitation({ messageId, citationId });
    }
  };

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
      const assistantMessage = await sendMessage(message);
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

  const modalContent = isMinimized ? (
    <div className="fixed bottom-[80px] right-4 z-50">
      <div className="bg-blue-600 rounded-full shadow-lg p-4 flex items-center space-x-4">
        <span className="text-sm font-medium text-white">
          AI Chat
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 hover:bg-blue-500 rounded-full transition-colors"
            aria-label="Maximize chat"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => {
              setIsMinimized(false);
              onClose();
            }}
            className="p-1.5 hover:bg-blue-500 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div 
        className="fixed inset-0 bg-black/20" 
        onClick={() => setIsMinimized(true)}
      />
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto w-[75vw]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {userName.split(' ')[0]}'s AI Assistant
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ask me anything about my workspace
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!user && (
                <div className="p-2 bg-yellow-100 text-yellow-700 rounded">
                  Please sign in to use the chat.
                </div>
              )}
              {messages.map((msg) => (
                <MessageHighlight
                  key={msg.id}
                  isHighlighted={msg.id === highlightedMessageId}
                >
                  <div
                    id={`message-${msg.id}`}
                    ref={msg.id === highlightedMessageId ? messageRef : undefined}
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
                        <>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {msg.references ? (
                              formatMessageWithCitations(
                                msg.content,
                                msg.references,
                                (citationId) => {
                                  if (msg.id) {
                                    handleCitationClick(citationId, msg.id);
                                  }
                                }
                              )
                            ) : (
                              <ReactMarkdown
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
                          {msg.citations && msg.references && msg.id && (() => {
                            const { citations, references } = getUsedCitations(msg.content, msg.citations, msg.references);
                            return citations.length > 0 ? (
                              <CitationComponent
                                messageId={msg.id}
                                citations={citations}
                                references={references}
                                minimizeAIChat={() => setIsMinimized(true)}
                                className="mt-4 border-t pt-4"
                                highlightedCitation={highlightedCitation}
                                onNavigateToMessage={handleNavigateToMessage}
                                setHighlightedCitation={setHighlightedCitation}
                              />
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </MessageHighlight>
              ))}
              {error && (
                <div className="p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isLoading && (
              <div className="px-4 py-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-gray-900 to-gray-500 animate-[shimmer_2s_infinite] bg-[length:200%_auto]">
                  Searching...
                </span>
              </div>
            )}

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