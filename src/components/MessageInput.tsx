'use client';

import { useState, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

type MessageInputProps = {
  onSendMessage: (message: string, file?: File) => void;
};

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    
    onSendMessage(newMessage.trim(), selectedFile || undefined);
    setNewMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      {previewUrl && (
        <div className="mb-2 p-2 border rounded-md">
          <div className="relative h-32 w-32">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover rounded"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:border-blue-500"
        />
        <label
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
          htmlFor="file-input"
        >
          <ImageIcon className="w-6 h-6 text-gray-500" />
        </label>
        <input
          id="file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
        <button 
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-500"
        >
          Send
        </button>
      </div>
    </form>
  );
} 