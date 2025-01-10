import { useState, useRef, useEffect } from 'react';
import EmojiPickerReact from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showAbove, setShowAbove] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPicker && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      setShowAbove(spaceBelow < spaceAbove);
    }
  }, [showPicker]);

  const handleMouseLeave = () => {
    setShowPicker(false);
  };

  return (
    <div 
      className="relative" 
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 hover:bg-gray-200 rounded-md transition-colors duration-300 group"
      >
        <Smile className="w-4 h-4 text-gray-500 transition-colors duration-300" />
      </button>
      
      {showPicker && (
        <div 
          className={`absolute ${showAbove ? 'bottom-full' : 'top-full'} right-0 z-[100]`}
          style={{ 
            paddingBottom: showAbove ? '0.5rem' : '0', 
            paddingTop: showAbove ? '0' : '0.5rem',
          }}
        >
          <div className={`${showAbove ? 'mb-2' : 'mt-2'}`}>
            <EmojiPickerReact
              onEmojiClick={(emojiData) => {
                onEmojiSelect(emojiData.emoji);
                setShowPicker(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 