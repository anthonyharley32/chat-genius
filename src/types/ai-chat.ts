export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
} 