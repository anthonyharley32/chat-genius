'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Maximize2, Minimize2, X, Play, Loader2, Square } from 'lucide-react';
import { AIMessage } from '@/types/ai-chat';
import { Citation, CitationReference } from '@/types/citations';
import { useAIChat } from '@/hooks/useAIChat';
import { useUser } from '@/hooks/useUser';
import { useMessageHighlight } from '@/hooks/useMessageHighlight';
import ReactMarkdown from 'react-markdown';
import { MessageHighlight } from '@/components/ui/MessageHighlight';
import { CitationComponent } from '@/components/ui/CitationComponent';
import { useRouter } from 'next/navigation';
import { useAIMemory } from '@/hooks/useAIMemory';
import { AIChatHistory } from '@/types/ai-memory';
import { createClient } from '@/utils/supabase/client';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  userName?: string;
  targetUserId: string;
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
  
  // Map the parts to React elements and wrap them in a parent div
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
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
      })}
    </div>
  );
}

function getUsedCitations(content: string, citations: Citation[], references: CitationReference[]) {


  // Find all citation markers in the content in order of appearance
  const markers = content.match(/\{ref:\d+\}/g) || [];
  const usedRefNumbers = markers
    .map(marker => {
      const match = marker.match(/\d+/);
      return match ? match[0] : null;
    })
    .filter((ref): ref is string => ref !== null);

  
  // Create sequential display numbers while preserving original order
  const uniqueRefs = Array.from(new Set(usedRefNumbers));
  const displayNumberMap = new Map(
    uniqueRefs.map((ref, index) => [ref, (index + 1).toString()])
  );
    
  // Track citation order based on first appearance in text
  const citationOrder = usedRefNumbers
    .map(refNum => {
      const ref = references.find(r => r.referenceText === refNum);
      const displayNumber = displayNumberMap.get(refNum);
      return ref && displayNumber ? { refNum, citationId: ref.citationId, displayNumber } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);


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

  
  // Order citations based on their first appearance in the text
  const orderedCitations = citations
    .filter(citation => usedCitationIds.has(citation.id))
    .sort((a, b) => {
      const aIndex = citationOrder.findIndex(c => c.citationId === a.id);
      const bIndex = citationOrder.findIndex(c => c.citationId === b.id);
      return aIndex - bIndex;
    });
    
  return {
    citations: orderedCitations,
    references: newReferences
  };
}

export function ChatModal({ isOpen, onClose, userName = "User", targetUserId }: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<{
    messageId: string;
    citationId: string;
  } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messageRef = useMessageHighlight(highlightedMessageId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading, error } = useAIChat(targetUserId);
  const { user } = useUser();
  const { history } = useAIMemory(targetUserId);
  const [localHistory, setLocalHistory] = useState<AIChatHistory[]>([]);
  const router = useRouter();
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const supabase = createClient();
  const [audioContextRef] = useState<{ current: AudioContext | null }>({ current: null });
  const [audioSourceRef] = useState<{ current: AudioBufferSourceNode | null }>({ current: null });

  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

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
  }, [localHistory]);

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

    const userTempId = `temp-${Date.now()}-user`;
    const aiTempId = `temp-${Date.now()}-ai`;
    
    try {
      // Add optimistic user message and AI loading message
      const optimisticUserMessage: AIChatHistory = {
        id: userTempId,
        user_id: user.id,
        target_user_id: targetUserId,
        content: message,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const optimisticAIMessage: AIChatHistory = {
        id: aiTempId,
        user_id: targetUserId,
        target_user_id: user.id,
        content: "",  // Empty content since we're showing the loading state separately
        role: 'assistant',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLocalHistory(prev => [...prev, optimisticUserMessage, optimisticAIMessage]);
      
      // Send the actual message
      const response = await sendMessage(message);
      
      // Update AI message with actual response and a permanent ID
      const permanentId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      setLocalHistory(prev => prev.map(msg => {
        if (msg.id === aiTempId) {
          return {
            ...msg,
            id: permanentId, // Use a permanent ID instead of the temp one
            content: response.content,
            citations: response.citations,
            references: response.references,
          };
        }
        return msg;
      }));
      
      setMessage('');
    } catch (err) {
      console.error('Error getting AI response:', err);
      // Remove both optimistic messages on error
      setLocalHistory(prev => prev.filter(msg => msg.id !== userTempId && msg.id !== aiTempId));
    }
  };

  const unlockAudioContext = async (audioCtx: AudioContext) => {
    if (audioCtx.state === 'suspended') {
      console.log('Attempting to unlock audio context');
      try {
        await audioCtx.resume();
        console.log('Audio context unlocked successfully');
      } catch (error) {
        console.error('Failed to unlock audio context:', error);
        throw error; // Propagate the error
      }
    }
  };

  const synthesizeAndPlay = async (message: string, messageId: string) => {
    if (synthesizing) return;
    
    try {
      // If we're already playing this message, stop it
      if (playingMessageId === messageId && audioSourceRef.current) {
        console.log('Stopping current playback');
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
        setPlayingMessageId(null);
        setSynthesizing(false);
        return;
      }
      
      setSynthesizing(true);
      setPlayingMessageId(messageId);

      // Clean up any existing audio context
      if (audioContextRef.current?.state === 'running') {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      const { data: voicePreference } = await supabase
        .from('voice_preferences')
        .select('voice_id')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single();

      if (!voicePreference?.voice_id) {
        console.warn('No voice preference found');
        return;
      }

      console.log('Starting synthesis for message:', message.substring(0, 50) + '...');
      
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/tts/${voicePreference.voice_id}?user_id=${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          model_id: "eleven_monolingual_v1"
        }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Response received, content-type:', contentType);
      
      if (!contentType?.includes('audio/')) {
        console.error('Invalid content type received:', contentType);
        throw new Error('Invalid audio response');
      }

      const audioBlob = await response.blob();
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Empty audio response received');
      }

      // Create new audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      console.log('Created new audio context');

      // Ensure audio context is unlocked
      await unlockAudioContext(audioContextRef.current);

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Array buffer created, size:', arrayBuffer.byteLength);

      // Decode the audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      console.log('Audio decoded, duration:', audioBuffer.duration);

      // Create buffer source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      audioSourceRef.current = source;

      // Handle completion
      source.onended = () => {
        console.log('Audio playback completed');
        setPlayingMessageId(null);
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.disconnect();
          } catch (error) {
            console.error('Error disconnecting audio source:', error);
          }
          audioSourceRef.current = null;
        }
        // Close the audio context after playback
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(console.error);
          audioContextRef.current = null;
        }
      };

      console.log('Starting audio playback');
      source.start(0);
      console.log('Audio playback started successfully');

    } catch (error) {
      console.error('Error in audio synthesis/playback:', error);
      cleanup();
    } finally {
      setSynthesizing(false);
    }
  };

  // Add cleanup function
  const cleanup = () => {
    setPlayingMessageId(null);
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        console.warn('Error stopping audio source:', e);
      }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    setSynthesizing(false);
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return createPortal(
    isMinimized ? (
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
                {localHistory.map((msg) => (
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
                            <div className="flex items-start justify-between">
                              <div className="prose prose-sm max-w-none dark:prose-invert flex-1">
                                {msg.content ? (
                                  msg.references ? (
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
                                      }}
                                    >
                                      {msg.content}
                                    </ReactMarkdown>
                                  )
                                ) : isLoading && msg.id.startsWith('temp-') && msg.id.endsWith('-ai') ? (
                                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-gray-900 to-gray-500 animate-[shimmer_2s_infinite] bg-[length:200%_auto]">
                                    Searching...
                                  </span>
                                ) : null}
                              </div>
                              {msg.content && !msg.id.startsWith('temp-') && (
                                <button
                                  onClick={() => synthesizeAndPlay(msg.content, msg.id)}
                                  disabled={synthesizing && playingMessageId === msg.id}
                                  className="ml-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                                  aria-label={synthesizing && playingMessageId === msg.id ? "Synthesizing speech..." : playingMessageId === msg.id ? "Stop playback" : "Play message"}
                                >
                                  {synthesizing && playingMessageId === msg.id ? (
                                    <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
                                  ) : playingMessageId === msg.id ? (
                                    <Square className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  ) : (
                                    <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  )}
                                </button>
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
    ),
    document.body
  );
} 