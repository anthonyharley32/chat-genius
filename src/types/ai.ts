export interface AIMessage {
  content: string;
  citations?: {
    messageId: string;
    content: string;
    metadata: {
      userName: string;
      timestamp: string;
    };
  }[];
} 