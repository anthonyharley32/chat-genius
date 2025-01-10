'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { statusType, StatusType } from '@/types/status';
import { SearchResults } from './SearchResults';

interface SidebarProps {
  channels: { id: string; name: string }[];
  users: {
    id: string;
    full_name: string;
    status: StatusType;
  }[];
  currentChannel: string;
  selectedUser: string | null;
  onChannelSelect: (channelId: string) => void;
  onUserSelect: (userId: string) => void;
  onCreateChannel?: (name: string) => void;
  onMessageSelect?: (messageId: string) => void;
}

export default function Sidebar({ 
  channels, 
  users, 
  currentChannel, 
  selectedUser,
  onChannelSelect,
  onUserSelect,
  onCreateChannel,
  onMessageSelect 
}: SidebarProps) {
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleCreateChannel = () => {
    if (!isCreatingChannel) {
      setIsCreatingChannel(true);
      return;
    }

    if (newChannelName.trim() && onCreateChannel) {
      onCreateChannel(newChannelName.trim());
      setNewChannelName('');
      setIsCreatingChannel(false);
      setShowChannelDropdown(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateChannel();
    } else if (e.key === 'Escape') {
      setIsCreatingChannel(false);
      setNewChannelName('');
    }
  };

  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };

  return (
    <div className="w-56 bg-gray-800 text-gray-300 h-[calc(100vh-4rem)] fixed left-0 top-16 p-4 overflow-y-auto">
      {/* Channels Section */}
      <div className="mb-8">
        <div 
          className="flex items-center cursor-pointer group mb-2 hover:bg-gray-800 p-2 rounded transition-colors"
          onClick={() => setShowChannelDropdown(!showChannelDropdown)}
        >
          <h3 className="text-sm tracking-wider text-gray-400">CHANNELS</h3>
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform duration-200 ml-1 ${
              showChannelDropdown ? 'transform rotate-180' : ''
            }`}
          />
        </div>

        {showChannelDropdown && (
          <div className="absolute left-4 mt-1 py-1 bg-white rounded-md shadow-lg border border-gray-200 w-48 z-10">
            {isCreatingChannel ? (
              <div className="px-4 py-2 flex items-center">
                <input
                  type="text"
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full px-2 py-1 text-sm text-gray-700 border rounded focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            ) : (
              <button 
                onClick={handleCreateChannel}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Create Channel
              </button>
            )}
          </div>
        )}

        <ul className="space-y-1">
          {channels.map(channel => (
            <li 
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={`cursor-pointer px-4 py-2 rounded transition-all duration-150 text-white ${
                currentChannel === channel.id 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              <span className="text-gray-500 mr-1">#</span>
              {channel.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Users Section */}
      <div>
        <h3 className="text-sm tracking-wider text-gray-400 mb-2 p-2">DIRECT MESSAGES</h3>
        <ul className="space-y-1">
          {users.map(user => (
            <li
              key={user.id}
              onClick={() => onUserSelect(user.id)}
              className={`cursor-pointer px-4 py-2 rounded transition-all duration-150 flex items-center text-white ${
                selectedUser === user.id 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              <span 
                className={`inline-block w-2 h-2 rounded-full mr-2 ${statusType[user.status]?.color || statusType.offline.color}`}
                title={statusType[user.status]?.label || statusType.offline.label}
              />
              {user.full_name}
            </li>
          ))}
        </ul>
      </div>

      {/* Modified Search Input */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 rounded-md px-4 py-2 pr-8"
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
            onFocus={handleSearchFocus}
          />
          {searchText && (
            <button 
              onClick={() => {
                setSearchText('');
                setShowSearchResults(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          )}
          <SearchResults
            searchText={searchText}
            onResultClick={(messageId) => {
              if (onMessageSelect) {
                onMessageSelect(messageId);
                setShowSearchResults(false);
                setSearchText('');
              }
            }}
            isOpen={showSearchResults}
          />
        </div>
      </div>
    </div>
  );
} 