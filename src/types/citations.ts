export interface Citation {
  id: string;
  messageId: string;
  similarityScore: number;
  previewText: string;
  metadata: {
    timestamp: string;
    userId: string;
    userName: string;
  }
}

export interface CitationReference {
  citationId: string;
  inlinePosition: number;
  referenceText: string;
} 