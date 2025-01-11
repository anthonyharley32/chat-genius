'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '../hooks/useUser';
import { Modal } from '@/components/ui/Modal';

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
}

interface SearchResultsProps {
  searchText: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchResults({
  searchText,
  isOpen,
  onClose,
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const supabase = createClient();
  const { user } = useUser();

  useEffect(() => {
    if (!searchText || !isOpen) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
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
        .textSearch('content', searchText, {
          type: 'plain',
          config: 'english'
        })
        .returns<MessageResponse[]>();

      if (error) {
        console.error('Error searching messages:', error);
        return;
      }

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
    };

    fetchResults();
  }, [searchText, isOpen]);

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
      <div className="w-[32rem] p-4">
        <h2 className="text-lg font-semibold mb-4">Search Results</h2>
        {results.length === 0 ? (
          <div className="text-gray-500">No results found</div>
        ) : (
          <div className="divide-y">
            {results.map((result) => (
              <div
                key={result.id}
                className="py-3 hover:bg-gray-50 transition-colors cursor-pointer -mx-4 px-4"
                onClick={() => {
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