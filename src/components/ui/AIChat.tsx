import { useState } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { useMessageNavigation } from '@/utils/messageNavigation';
import { AIMessage } from '@/types/ai';
import { CitationComponent } from './CitationComponent';
import { Citation } from '@/types/citations';
import { useRouter } from 'next/navigation';

interface AIResponse {
  content: string;
  citations?: Citation[];
}

export function AIChat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const { sendMessage, isLoading, error } = useAIChat();
  const { navigate } = useMessageNavigation();
  const router = useRouter();

  const handleNavigateToMessage = (messageId: string, channelId: string | null, userId: string | null) => {
    if (channelId) {
      // Navigate to channel
      router.push(`/chat?type=channel&channelId=${channelId}`);
    } else if (userId) {
      // Navigate to DM
      router.push(`/chat?type=dm&userId=${userId}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const aiResponse = await sendMessage(message);
      setResponse({
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

      {response && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Response:</h3>
          <p className="whitespace-pre-wrap">{response.content}</p>
          {response.citations && response.citations.length > 0 && (
            <CitationComponent 
              citations={response.citations} 
              references={[]} 
              minimizeAIChat={handleMinimize}
              onNavigateToMessage={handleNavigateToMessage}
            />
          )}
        </div>
      )}
    </div>
  );
} 