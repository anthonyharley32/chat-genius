'use client';

import { useState, useRef } from 'react';
import { ImageIcon, FileIcon } from 'lucide-react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';

type MessageInputProps = {
  onSendMessage: (content: string, file: File | null) => Promise<void>;
  channelId: string;
  user: any;
  selectedUser?: string | null;
  placeholder?: string;
};

const supabase = createClient();

export function MessageInput({ onSendMessage, channelId, user, selectedUser }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

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

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }
    
    setFile(uploadedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      console.log('MessageInput: Submitting message', {
        content: newMessage,
        file: file ? file.name : null
      });

      // Clear states immediately before sending
      const messageContent = newMessage;
      const messageFile = file;
      setNewMessage('');
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Send message with file if present
      await onSendMessage(messageContent, messageFile);
      
    } catch (error) {
      console.error('Error in MessageInput handleSubmit:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image or video
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Only image and video files are supported');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Handle videos
    if (isVideo) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Video files must be less than ${MAX_FILE_SIZE /(1024 * 1024)}MB`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    // Handle images
    try {
      let finalFile = file;
      if (file.size > MAX_IMAGE_SIZE) {
        finalFile = await compressImage(file);
      }
      setFile(finalFile);
      setPreviewUrl(URL.createObjectURL(finalFile));
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Error processing image. Please try again.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      {(previewUrl || file) && (
        <div className="p-2 border-b">
          {previewUrl && (
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
                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-sm leading-[0px]"
              >
                ×
              </button>
            </div>
          )}
          {file && !previewUrl && (
            <div className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-lg max-w-fit">
              <FileIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-red-500 hover:text-red-600 ml-2"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center space-x-2 p-4">
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
          accept="application/pdf,.pdf,image/*,video/*"
          className="hidden"
        />
        <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-full group relative">
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <FileIcon className="w-6 h-6 text-gray-500" />
          <span className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 mb-2 whitespace-nowrap">
            Files (max 10MB)
          </span>
        </label>
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