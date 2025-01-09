'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface SidebarProps {
  channels: { id: string; name: string }[];
  users: any[];
  currentChannel: string;
  selectedUser: string | null;
  onChannelSelect: (channelId: string) => void;
  onUserSelect: (userId: string) => void;
}

export default function Sidebar({ 
  channels, 
  users, 
  currentChannel, 
  selectedUser,
  onChannelSelect,
  onUserSelect 
}: SidebarProps) {
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  return (
    <div className="w-64 bg-gray-800 text-gray-300 h-[calc(100vh-4rem)] fixed left-0 top-16 p-4 overflow-y-auto">
      {/* Channels Section */}
      <div className="mb-8">
        <div 
          className="flex items-center justify-between cursor-pointer group mb-2 hover:bg-gray-800 p-2 rounded transition-colors"
          onClick={() => setShowChannelDropdown(!showChannelDropdown)}
        >
          <h3 className="text-sm tracking-wider text-gray-400">CHANNELS</h3>
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform duration-200 ${
              showChannelDropdown ? 'transform rotate-180' : ''
            }`}
          />
        </div>

        {showChannelDropdown && (
          <div className="py-1 mb-2">
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200 rounded transition-colors">
              <Plus size={16} className="mr-2" />
              Create Channel
            </button>
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
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                user.online ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              {user.full_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 