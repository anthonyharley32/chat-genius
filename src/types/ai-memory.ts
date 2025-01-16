import { Citation, CitationReference } from './citations';

export interface AIAvatarSettings {
  user_id: string;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIChatHistory {
  id: string;
  user_id: string;
  target_user_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  updated_at: string;
  citations?: Citation[];
  references?: CitationReference[];
  citation_references?: CitationReference[];
}

export interface AIMemoryMessage {
  content: string;
  role: 'user' | 'assistant';
  citations?: Citation[];
  references?: CitationReference[];
}

// For creating new chat history entries
export interface CreateAIChatHistoryParams {
  user_id: string;
  target_user_id: string;
  content: string;
  role: 'user' | 'assistant';
  citations?: Citation[];
  references?: CitationReference[];
} 