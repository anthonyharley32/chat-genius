export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
} 