import { useState } from 'react';
import EmojiPickerReact from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <Smile className="w-5 h-5 text-gray-500" />
      </button>
      
      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-[100]">
          <EmojiPickerReact
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData.emoji);
              setShowPicker(false);
            }}
          />
        </div>
      )}
    </div>
  );
} 