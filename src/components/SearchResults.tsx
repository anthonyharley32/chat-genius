'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '../hooks/useUser';
import { Modal } from '@/components/ui/Modal';
import { Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  content: string;
  channel_id: string;
  channel_name?: string;
  user_id: string;
  user_name?: string;
  is_direct_message: boolean;
  receiver_id?: string;
  receiver_name?: string;
  similarity?: number;
}

interface MessageResponse {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  is_direct_message: boolean;
  receiver_id: string | null;
  channels: { name: string } | null;
  sender: { full_name: string } | null;
  receiver: { full_name: string } | null;
  similarity?: number;
}

interface SearchResultsProps {
  searchText: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
}

export default function SearchResults({
  searchText,
  isOpen,
  onClose,
  onNavigateToMessage
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { user } = useUser();

  useEffect(() => {
    if (!searchText || !isOpen) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            channel_id,
            user_id,
            is_direct_message,
            receiver_id,
            channels(name),
            sender:users!messages_user_id_fkey(full_name),
            receiver:users!messages_receiver_id_fkey(full_name)
          `)
          .ilike('content', `%${searchText}%`)
          .limit(50)
          .order('created_at', { ascending: false })
          .returns<MessageResponse[]>();

        if (error) throw error;

        const formattedResults = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          channel_id: msg.channel_id,
          channel_name: msg.channels?.name || '',
          user_id: msg.user_id,
          user_name: msg.sender?.full_name || '',
          is_direct_message: msg.is_direct_message,
          receiver_id: msg.receiver_id || undefined,
          receiver_name: msg.receiver?.full_name || ''
        }));

        setResults(formattedResults);
      } catch (err) {
        console.error('Error searching messages:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while searching');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchText, isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          const result = results[selectedIndex];
          onNavigateToMessage(
            result.id,
            result.is_direct_message ? null : result.channel_id,
            result.is_direct_message ? (result.user_id === user?.id ? result.receiver_id || null : result.user_id) : null
          );
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  useEffect(() => {
    // Scroll selected item into view
    const selectedElement = resultsRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const getContextString = (content: string, searchTerm: string) => {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return content;

    // Get the full content before and after the search term
    const before = content.slice(0, index);
    const after = content.slice(index + searchTerm.length);

    // Get the last few words before the search term
    const beforeWords = before.split(' ').filter(word => word.length < 20).slice(-6).join(' ');
    // Get the first few words after the search term
    const afterWords = after.split(' ').filter(word => word.length < 20).slice(0, 6).join(' ');

    let contextString = '';
    if (beforeWords) contextString += '...' + beforeWords + ' ';
    contextString += `<strong>${content.slice(index, index + searchTerm.length)}</strong>`;
    if (afterWords) contextString += ' ' + afterWords + '...';

    return contextString;
  };

  if (!isOpen || !searchText) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div 
        className="w-[32rem] p-4"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <h2 className="text-lg font-semibold mb-4">Search Results</h2>
        
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        {!loading && results.length === 0 ? (
          <div className="text-gray-500">No results found</div>
        ) : (
          <div className="divide-y" ref={resultsRef}>
            {results.map((result, index) => (
              <div
                key={result.id}
                className={`py-3 hover:bg-gray-50 transition-colors cursor-pointer -mx-4 px-4 ${
                  index === selectedIndex ? 'bg-gray-50' : ''
                }`}
                onClick={() => {
                  onNavigateToMessage(
                    result.id,
                    result.is_direct_message ? null : result.channel_id,
                    result.is_direct_message ? (result.user_id === user?.id ? result.receiver_id || null : result.user_id) : null
                  );
                  onClose();
                }}
              >
                <div className="font-bold text-sm text-gray-700 mb-1">
                  {result.is_direct_message ? (
                    `${result.user_id === user?.id ? result.receiver_name : result.user_name}`
                  ) : (
                    `#${result.channel_name || 'unknown'}`
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">
                    {result.user_id === user?.id ? 'You' : result.user_name}:
                  </span>
                  {' '}
                  <span dangerouslySetInnerHTML={{ 
                    __html: getContextString(result.content, searchText)
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}