import { useState } from 'react';
import { useAIChat } from '@/hooks/useAIChat';

export function AIChat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const { sendMessage, isLoading, error } = useAIChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const aiResponse = await sendMessage(message);
      setResponse(aiResponse);
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

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
          <p className="whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
} 