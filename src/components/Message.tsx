import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { EmojiPicker } from './EmojiPicker';
import { MessageReaction } from './MessageReaction';
import Image from 'next/image';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
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
  };
}

export function Message({ message }: MessageProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const supabase = createClient();
  const getAvatarUrl = useAvatarUrl();

  useEffect(() => {
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

  const loadReactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get all reactions for this message
    const { data: reactionData } = await supabase
      .from('reactions')
      .select('emoji, user_id')
      .eq('message_id', message.id);

    if (reactionData) {
      // Group reactions by emoji
      const groupedReactions = reactionData.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            count: 0,
            hasReacted: false
          };
        }
        acc[reaction.emoji].count++;
        if (reaction.user_id === user?.id) {
          acc[reaction.emoji].hasReacted = true;
        }
        return acc;
      }, {} as Record<string, { count: number; hasReacted: boolean }>);

      // Convert to array format
      setReactions(Object.entries(groupedReactions).map(([emoji, data]) => ({
        emoji,
        ...data
      })));
    }
  };

  const handleReaction = async (emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingReaction } = await supabase
      .from('reactions')
      .select()
      .eq('message_id', message.id)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existingReaction) {
      // Remove reaction if it exists
      await supabase
        .from('reactions')
        .delete()
        .eq('message_id', message.id)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      // Add new reaction
      await supabase
        .from('reactions')
        .insert({
          message_id: message.id,
          user_id: user.id,
          emoji: emoji
        });
    }

    // Refresh reactions
    loadReactions();
  };

  return (
    <div className="group relative hover:bg-gray-100 transition-colors">
      <div className="flex items-start space-x-3 p-2">
        <Image
          src={getAvatarUrl(message.user?.avatar_url || '/defpropic.jpg') as string}
          alt={message.user?.full_name || 'User'}
          width={32}
          height={32}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="font-bold">{message.user?.full_name || 'Unknown User'}</span>
              <span className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <EmojiPicker onEmojiSelect={handleReaction} />
            </div>
          </div>
          {message.content && (
            <p className="mt-1">{message.content}</p>
          )}
          {message.image_url && (
            <img 
              src={message.image_url} 
              alt="Message attachment" 
              className="mt-2 max-w-sm rounded-lg"
            />
          )}
          <div className="flex items-center gap-2 mt-1">
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
        </div>
      </div>
    </div>
  );
} 