import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { EmojiPicker } from './EmojiPicker';
import { MessageReaction } from './MessageReaction';
import { VideoPlayer } from './VideoPlayer';
import Image from 'next/image';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { FileIcon, Download, X, MessageSquare } from 'lucide-react';
import { useMessageHighlight } from '@/hooks/useMessageHighlight';
import { ThreadIndicator } from './ThreadIndicator';
import ReactMarkdown from 'react-markdown';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  created_at: string;
}

interface MessageProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
    image_url?: string;
    file_url?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    channel_id?: string;
    is_direct_message: boolean;
    receiver_id?: string;
    user_id: string;
  };
  isConsecutive?: boolean;
  highlightedMessageId?: string | null;
  onThreadSelect?: (message: MessageProps['message']) => void;
}

export function Message({ message, isConsecutive = false, highlightedMessageId, onThreadSelect }: MessageProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const supabase = createClient();
  const getAvatarUrl = useAvatarUrl();
  const messageRef = useMessageHighlight(highlightedMessageId === message.id ? message.id : null);

  const loadReactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: reactionData, error } = await supabase
        .from('reactions')
        .select(`
          emoji,
          user_id,
          created_at
        `)
        .eq('message_id', message.id)
        .order('created_at');

      if (error) {
        console.error('Error loading reactions:', error);
        return;
      }

      if (reactionData) {
        const groupedReactions = reactionData.reduce((acc, reaction) => {
          const emoji = reaction.emoji;
          if (!acc[emoji]) {
            acc[emoji] = {
              count: 0,
              hasReacted: false,
              created_at: reaction.created_at
            };
          }
          acc[emoji].count++;
          if (reaction.user_id === user?.id) {
            acc[emoji].hasReacted = true;
          }
          return acc;
        }, {} as Record<string, { count: number; hasReacted: boolean; created_at: string }>);

        setReactions(
          Object.entries(groupedReactions)
            .map(([emoji, data]) => ({
              emoji,
              ...data
            }))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        );
      }
    } catch (error) {
      console.error('Error in loadReactions:', error);
    }
  };

  useEffect(() => {
    loadReactions();

    const channel = supabase
      .channel(`message-reactions-${message.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${message.id}`
      }, () => {
        loadReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [message.id]);

  const handleReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Optimistically update UI
      const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
      const hasReacted = existingReactionIndex !== -1 && reactions[existingReactionIndex].hasReacted;

      setReactions(prev => {
        const newReactions = [...prev];
        if (existingReactionIndex !== -1) {
          if (hasReacted) {
            // Remove reaction
            newReactions[existingReactionIndex] = {
              ...newReactions[existingReactionIndex],
              count: Math.max(0, newReactions[existingReactionIndex].count - 1),
              hasReacted: false
            };
            if (newReactions[existingReactionIndex].count === 0) {
              newReactions.splice(existingReactionIndex, 1);
            }
          } else {
            // Add reaction
            newReactions[existingReactionIndex] = {
              ...newReactions[existingReactionIndex],
              count: newReactions[existingReactionIndex].count + 1,
              hasReacted: true
            };
          }
        } else {
          // New reaction
          newReactions.push({ emoji, count: 1, hasReacted: true, created_at: new Date().toISOString() });
        }
        return newReactions;
      });

      if (hasReacted) {
        // Remove reaction from database
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('message_id', message.id)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        // Add reaction to database
        const { error } = await supabase
          .from('reactions')
          .insert({
            message_id: message.id,
            user_id: user.id,
            emoji: emoji
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      // Revert optimistic update on error
      loadReactions();
    }
  };

  return (
    <div 
      ref={messageRef}
      id={`message-${message.id}`}
      className={`py-1 group hover:bg-gray-100 transition-colors rounded-lg ${isConsecutive ? 'pl-[60px]' : 'px-2'}`}
    >
      <div className="relative">
        <div className={`flex items-start ${isConsecutive ? 'py-0 pr-2' : 'p-2 pb-0'} ${!isConsecutive && 'space-x-3'}`}>
          {!isConsecutive && (
            <Image
              src={getAvatarUrl(message.user?.avatar_url || '/defpropic.jpg') as string}
              alt={message.user?.full_name || 'User'}
              width={32}
              height={32}
              className="rounded-full aspect-square object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              {!isConsecutive && (
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{message.user?.full_name || 'Unknown User'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                    <EmojiPicker onEmojiSelect={handleReaction} />
                    <button 
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      aria-label="Reply to message"
                      onClick={() => onThreadSelect?.(message)}
                    >
                      <MessageSquare size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              )}
              {message.content && (
                <div className="mt-0 leading-tight">
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
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {message.image_url && (
              <div className="mt-2 max-w-sm min-h-[200px] rounded-lg bg-gray-100 relative overflow-hidden">
                <img 
                  src={message.image_url} 
                  alt="Message attachment" 
                  className="max-w-full rounded-lg w-auto h-auto max-h-[400px] object-contain"
                  loading="lazy"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.position = 'static';  // Remove absolute positioning after load
                    img.parentElement?.classList.remove('bg-gray-100');  // Remove background after load
                  }}
                />
              </div>
            )}
            {message.file_url && (
              <div className="mt-2">
                {message.file_type?.startsWith('image/') ? (
                  // Handle images
                  <div className="max-w-[min(100%,300px)] min-h-[200px] bg-gray-100 relative overflow-hidden">
                    <img 
                      src={message.file_url} 
                      alt={message.file_name || 'Image attachment'} 
                      className="rounded-lg w-auto h-auto max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                      onClick={() => setShowImageModal(true)}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.position = 'static';  // Remove absolute positioning after load
                        img.parentElement?.classList.remove('bg-gray-100');  // Remove background after load
                      }}
                    />
                  </div>
                ) : message.file_type?.startsWith('video/') ? (
                  // Handle videos with new VideoPlayer component
                  <VideoPlayer 
                    src={message.file_url || ''} 
                    fileName={message.file_name || undefined}
                  />
                ) : (
                  // Handle other files as links
                  <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-100 group-hover:bg-gray-200 hover:!bg-gray-300 transition-colors rounded-lg max-w-fit"
                  >
                    <FileIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">{message.file_name}</span>
                    <Download className="w-4 h-4 text-gray-500" />
                  </a>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {reactions.map((reaction) => (
                  <MessageReaction
                    key={reaction.emoji}
                    emoji={reaction.emoji}
                    count={reaction.count}
                    hasReacted={reaction.hasReacted}
                    onReact={() => handleReaction(reaction.emoji)}
                  />
                ))}
              </div>
              <ThreadIndicator 
                messageId={message.id} 
                onClick={() => onThreadSelect?.(message)} 
              />
            </div>
          </div>
          {isConsecutive && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
              <EmojiPicker onEmojiSelect={handleReaction} />
              <button 
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Reply to message"
                onClick={() => onThreadSelect?.(message)}
              >
                <MessageSquare size={16} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {showImageModal && message.file_type?.startsWith('image/') && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center mt-16"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative w-full h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="relative inline-block">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageModal(false);
                }}
                className="absolute -top-4 -right-4 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors z-10 shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={message.file_url || undefined}
                alt={message.file_name || 'Image preview'}
                className="max-w-[95%] max-h-[calc(95vh-4rem)] w-auto h-auto object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 