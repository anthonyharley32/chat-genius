'use client';

import { useState, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

type MessageInputProps = {
  onSendMessage: (message: string, file?: File) => void;
};

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024* 1024; // 10MB for videos
  const MAX_IMAGE_SIZE = 5 * 1024 *1024; // 5MB before compression

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 2,              // Compress to max 2MB
      maxWidthOrHeight: 1920,    // Maintain good quality for modern displays
      useWebWorker: true,        // Better performance
    };
    
    try {
      const compressedFile = await imageCompression(file, options);
      console.log('Compression complete:', {
        'Original size': file.size / 1024 / 1024 + 'MB',
        'Compressed size': compressedFile.size / 1024 / 1024 + 'MB',
      });
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    
    onSendMessage(newMessage.trim(), selectedFile || undefined);
    setNewMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image or video
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Only image and video files are supported');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Handle videos
    if (isVideo) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`Video files must be less than ${MAX_FILE_SIZE /(1024 * 1024)}MB`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    // Handle images
    try {
      let finalFile = file;
      if (file.size > MAX_IMAGE_SIZE) {
        finalFile = await compressImage(file);
      }
      setSelectedFile(finalFile);
      setPreviewUrl(URL.createObjectURL(finalFile));
    } catch (error) {
      console.error('Error handling file:', error);
      alert('Error processing image. Please try again.');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer group relative"
          htmlFor="file-input"
        >
          <ImageIcon className="w-6 h-6 text-gray-500" />
          <span className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 mb-2 whitespace-nowrap">
            Images & Videos (max 10MB)
          </span>
        </label>
        <input
          id="file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
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