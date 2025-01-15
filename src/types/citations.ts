export interface Citation {
  id: string;
  messageId: string;
  similarityScore: number;
  previewText: string;
  metadata: {
    timestamp: string;
    userId: string;
    userName: string;
    channelId?: string;
    channelName?: string;
    isDirectMessage?: boolean;
    receiverId?: string;
    receiverName?: string;
  }
}

export interface CitationReference {
  citationId: string;
  inlinePosition: number;
  referenceText: string;
} 