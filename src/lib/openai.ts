import { AIMessage } from '@/types/ai-chat';

export async function streamChatCompletion(messages: AIMessage[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: messages[messages.length - 1].content }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from AI service');
    }

    const data = await response.json();
    return {
      choices: [{
        delta: {
          content: data.response
        }
      }]
    };
  } catch (error) {
    console.error('Error in streamChatCompletion:', error);
    throw error;
  }
} 