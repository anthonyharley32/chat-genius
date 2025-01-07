'use client';

import { useUsers } from '@/hooks/useUsers';

export default function ChatPage() {
  const users = useUsers();

  return (
    <div className="flex h-screen pt-16">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        {/* Workspace Name */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold">Workspace Name</h1>
        </div>
        
        {/* Channels */}
        <div className="p-4">
          <h2 className="text-gray-400 uppercase text-sm mb-2">Channels</h2>
          <ul className="space-y-1">
            <li className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"># general</li>
            <li className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"># random</li>
          </ul>
        </div>
        
        {/* Direct Messages */}
        <div className="p-4">
          <h2 className="text-gray-400 uppercase text-sm mb-2">Direct Messages</h2>
          <ul className="space-y-1">
            {users.map(user => (
              <li key={user.id} className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded">
                <span className={`w-2 h-2 ${user.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full inline-block mr-2`}></span>
                {user.full_name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel Header */}
        <div className="border-b px-6 py-2">
          <h2 className="text-xl font-bold"># general</h2>
          <p className="text-sm text-gray-500">Channel description goes here</p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-300"></div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-bold">John Doe</span>
                <span className="text-xs text-gray-500">12:34 PM</span>
              </div>
              <p>Hey everyone! How's it going?</p>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Message #general"
              className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
