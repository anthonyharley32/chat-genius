import { useState, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIMemory } from '@/hooks/useAIMemory';
import { useMessageNavigation } from '@/utils/messageNavigation';
import { AIMessage } from '@/types/ai';
import { CitationComponent } from './CitationComponent';
import { Citation } from '@/types/citations';
import { useRouter } from 'next/navigation';

interface AIResponse {
  id: string;
  content: string;
  citations?: Citation[];
}

interface AIchatProps {
  targetUserId: string;
}

export function AIChat({ targetUserId }: AIchatProps) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<{
    messageId: string;
    citationId: string;
  } | null>(null);
  const [showAllCitations, setShowAllCitations] = useState(false);
  const { sendMessage, isLoading, error } = useAIChat(targetUserId);
  const { history } = useAIMemory(targetUserId);
  const { navigate } = useMessageNavigation();
  const router = useRouter();

  const handleNavigateToMessage = (messageId: string, channelId: string | null, userId: string | null) => {
    if (channelId) {
      router.push(`/chat?type=channel&channelId=${channelId}`);
    } else if (userId) {
      router.push(`/chat?type=dm&userId=${userId}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const aiResponse = await sendMessage(message);
      const messageId = aiResponse.id || `ai-response-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setResponse({
        id: messageId,
        content: aiResponse.content,
        citations: aiResponse.citations
      });
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        AI Chat
      </button>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {history.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white ml-auto max-w-[80%]' 
                : 'bg-gray-100 text-gray-900 mr-auto max-w-[80%]'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {response && !history.find(msg => msg.id === response.id) && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="whitespace-pre-wrap">{response.content}</p>
            {response.citations && response.citations.length > 0 && (
              <CitationComponent 
                messageId={response.id}
                citations={response.citations} 
                references={[]} 
                minimizeAIChat={handleMinimize}
                onNavigateToMessage={handleNavigateToMessage}
                highlightedCitation={highlightedCitation}
                setHighlightedCitation={setHighlightedCitation}
                showAllCitations={showAllCitations}
                setShowAllCitations={setShowAllCitations}
              />
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
} 