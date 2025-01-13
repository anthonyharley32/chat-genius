'use client';

import { useState } from 'react';
import { ChevronDown, Plus, MoreVertical } from 'lucide-react';
import { statusType, StatusType } from '@/types/status';
import SearchResults from './SearchResults';
import { StatusDot } from './StatusDot';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

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
  onCreateChannel: (channelName: string) => void;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
  currentUserId: string;
}

export default function Sidebar({ 
  channels, 
  users, 
  currentChannel, 
  selectedUser,
  onChannelSelect,
  onUserSelect,
  onCreateChannel,
  onNavigateToMessage,
  currentUserId
}: SidebarProps) {
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);
  const { getUnreadCount, markAsRead } = useUnreadMessages(currentUserId);

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

  const handleChannelSelect = (channelId: string) => {
    onChannelSelect(channelId);
    markAsRead(channelId);
  };

  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
    markAsRead(undefined, userId);
  };

  return (
    <>
      <div className="w-56 bg-gray-800 text-gray-300 h-[calc(100vh-4rem)] fixed left-0 top-16 p-4 overflow-y-auto font-sans">
        {/* Channels Section */}
        <div className="mb-8">
          <div 
            className="flex items-center justify-between cursor-pointer group mb-2 hover:bg-gray-700 p-2 rounded-md transition-all duration-200"
            onClick={() => setShowChannelDropdown(!showChannelDropdown)}
          >
            <h3 className="text-sm tracking-wider text-gray-400 group-hover:text-gray-200 transition-colors font-sans font-light">CHANNELS</h3>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-gray-200 transition-all duration-200 ml-1 ${
                showChannelDropdown ? 'transform rotate-180' : ''
              }`}
            />
          </div>

          {showChannelDropdown && (
            <div className="absolute left-4 mt-1 py-2 bg-gray-700 rounded-lg shadow-lg border border-gray-600 w-48 z-10 transform transition-all duration-200 ease-out">
              {isCreatingChannel ? (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Channel name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="w-full px-3 py-2 text-sm text-gray-200 bg-gray-600 border border-gray-500 rounded-md 
                      focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                      placeholder-gray-400 transition-all duration-200"
                    autoFocus
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsCreatingChannel(false);
                        setNewChannelName('');
                        setShowChannelDropdown(false);
                      }}
                      className="px-3 py-1 text-sm text-gray-300 hover:text-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateChannel}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!newChannelName.trim()}
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleCreateChannel}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-600 
                    transition-all duration-200 group"
                >
                  <Plus size={16} className="mr-2 text-gray-400 group-hover:text-white transition-colors" />
                  Create Channel
                </button>
              )}
            </div>
          )}

          <ul className="space-y-1">
            {channels.map(channel => {
              const unreadCount = getUnreadCount(channel.id);
              return (
                <li 
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={`cursor-pointer px-4 py-2 rounded transition-all duration-150 flex items-center justify-between ${
                    currentChannel === channel.id 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1 font-medium">#</span>
                    <span className="font-medium text-white">{channel.name}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Users Section */}
        <div>
          <h3 className="text-sm tracking-wider text-gray-400 mb-2 p-2 font-sans font-light">DIRECT MESSAGES</h3>
          <ul className="space-y-1">
            {users.map(user => {
              const unreadCount = getUnreadCount(undefined, user.id);
              return (
                <li
                  key={user.id}
                  className="flex items-center group relative"
                >
                  <div
                    onClick={() => handleUserSelect(user.id)}
                    className={`cursor-pointer w-[calc(100%-28px)] px-4 py-2 rounded transition-all duration-150 flex items-center justify-between ${
                      selectedUser === user.id 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <StatusDot status={user.status} size="sm" shouldBlink={true} />
                      <div className="relative ml-2 min-w-0 flex-1">
                        <span className="font-medium text-white whitespace-nowrap overflow-hidden block"
                              style={{
                                maskImage: unreadCount > 0 
                                  ? 'linear-gradient(to right, black 85%, transparent 98%)'
                                  : 'linear-gradient(to right, black 85%, transparent 100%)',
                                WebkitMaskImage: unreadCount > 0 
                                  ? 'linear-gradient(to right, black 85%, transparent 98%)'
                                  : 'linear-gradient(to right, black 85%, transparent 100%)'
                              }}
                        >{user.full_name}</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] text-center ml-2 shrink-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveUserMenu(activeUserMenu === user.id ? null : user.id);
                      }}
                      data-user-id={user.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-white p-1 rounded hover:bg-gray-600 ml-1 w-7"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Search Input */}
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
            {showSearchResults && (
              <SearchResults
                searchText={searchText}
                isOpen={showSearchResults}
                onClose={() => {
                  setShowSearchResults(false);
                  setSearchText('');
                }}
                onNavigateToMessage={onNavigateToMessage}
              />
            )}
          </div>
        </div>
      </div>
      {/* Dropdown Menus Portal */}
      {users.map(user => (
        activeUserMenu === user.id && (
          <div key={`menu-${user.id}`} className="relative z-[60]" style={{ position: 'fixed' }}>
            <div 
              className="fixed inset-0" 
              onClick={() => setActiveUserMenu(null)}
            />
            <div 
              className="fixed py-1 w-48 bg-gray-800 rounded-md shadow-xl border border-gray-700 overflow-hidden"
              style={{
                left: '232px',
                top: (() => {
                  const button = document.querySelector(`[data-user-id="${user.id}"]`);
                  return button ? button.getBoundingClientRect().top : 0;
                })()
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle virtual chat action here
                  setActiveUserMenu(null);
                }}
                className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <span className="text-blue-400 group-hover:text-blue-300">🤖</span>
                Chat with virtual {user.full_name}
              </button>
            </div>
          </div>
        )
      ))}
    </>
  );
} 