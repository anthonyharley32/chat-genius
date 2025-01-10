'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '../hooks/useUser';

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
}

interface SearchResultsProps {
  searchText: string;
  onResultClick: (messageId: string) => void;
  isOpen: boolean;
}

export function SearchResults({ searchText, onResultClick, isOpen }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const supabase = createClient();
  const { user } = useUser();
  const currentUserName = user?.user_metadata?.full_name;

  useEffect(() => {
    if (!searchText || !isOpen) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      // Search messages with correct channel join
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
          users!messages_user_id_fkey(full_name),
          receiver:users!messages_receiver_id_fkey(full_name)
        `)
        .textSearch('content', searchText, {
          type: 'plain',
          config: 'english'
        });

      if (error) {
        console.error('Error searching messages:', error);
        return;
      }

      // Format results with proper channel access
      const formattedResults = messages.map(msg => {
        console.log('Message data:', msg);
        
        return {
          id: msg.id,
          content: msg.content,
          channel_id: msg.channel_id,
          channel_name: msg.channels?.name,
          user_id: msg.user_id,
          user_name: msg.users?.full_name,
          is_direct_message: msg.is_direct_message,
          receiver_id: msg.receiver_id,
          receiver_name: msg.receiver?.[0]?.full_name
        };
      });

      setResults(formattedResults);
    };

    fetchResults();
  }, [searchText, isOpen]);

  const getContextString = (content: string, searchTerm: string) => {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return content;

    const start = Math.max(0, index - 20);
    const end = Math.min(content.length, index + searchTerm.length + 20);
    let contextString = content.slice(start, end);

    if (start > 0) contextString = '...' + contextString;
    if (end < content.length) contextString = contextString + '...';

    return contextString;
  };

  if (!isOpen || !searchText) return null;

  return (
    <div className="absolute bottom-16 left-4 right-4 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto">
      {results.length === 0 ? (
        <div className="p-4 text-gray-500">No results found</div>
      ) : (
        <div className="divide-y">
          {results.map((result) => (
            <div
              key={result.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onResultClick(result.id)}
            >
              <div className="font-bold text-sm text-gray-700 mb-1">
                {result.is_direct_message ? (
                  `${
                    result.user_name === currentUserName 
                      ? result.receiver_name || 'Unknown User'
                      : result.user_name || 'Unknown User'
                  }`
                ) : (
                  `#${result.channel_name || 'unknown'}`
                )}
              </div>
              <div className="text-sm text-gray-600">
                "{getContextString(result.content, searchText)}"
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}