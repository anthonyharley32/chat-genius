import { Citation, CitationReference } from './citations';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  references?: CitationReference[];
} 