interface MessageReactionProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onReact: () => void;
}

export function MessageReaction({ emoji, count, hasReacted, onReact }: MessageReactionProps) {
  return (
    <button 
      onClick={onReact}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm 
        ${hasReacted ? 'bg-blue-100' : 'bg-gray-100'} 
        hover:bg-blue-200 transition-colors`}
    >
      <span>{emoji}</span>
      <span className="text-gray-600">{count}</span>
    </button>
  );
} 