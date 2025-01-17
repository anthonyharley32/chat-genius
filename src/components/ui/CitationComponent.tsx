'use client';

import { useState, useEffect } from 'react';
import { Citation, CitationReference } from '@/types/citations';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMessageNavigation } from '@/utils/messageNavigation';

interface CitationComponentProps {
  messageId: string;
  citations: Citation[];
  references: CitationReference[];
  minimizeAIChat?: () => void;
  className?: string;
  highlightedCitation?: {
    messageId: string;
    citationId: string;
  } | null;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
  setHighlightedCitation: (highlight: { messageId: string; citationId: string; } | null) => void;
  showAllCitations?: boolean;
  setShowAllCitations?: (show: boolean) => void;
}

function ReferencePreview({ citation }: { citation: Citation }) {
  return (
    <div className="absolute bottom-full mb-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-96 z-50">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium">{citation.metadata.userName}</span>
        <span className="text-xs text-gray-500">{citation.metadata.timestamp}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{citation.previewText}</p>
      <div className="mt-2 text-xs text-gray-500">
        Similarity: {(citation.similarityScore * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function CitationCard({ 
  citation, 
  minimizeAIChat,
  onMouseEnter,
  onMouseLeave,
  showPreview,
  highlighted = false,
  onNavigateToMessage,
  onHighlight
}: { 
  citation: Citation;
  minimizeAIChat?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showPreview: boolean;
  highlighted?: boolean;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
  onHighlight: (citationId: string) => void;
}) {
  const { navigate } = useMessageNavigation();

  const handleClick = () => {
    // First update the highlight state
    onHighlight(citation.id);

    // Then navigate to the channel/DM
    onNavigateToMessage(
      citation.messageId,
      citation.metadata.channelId || null,
      citation.metadata.isDirectMessage ? citation.metadata.userId : null
    );

    // Then minimize AI chat
    if (minimizeAIChat) {
      minimizeAIChat();
    }

    // Try to navigate multiple times with increasing delays
    const delays = [500, 1000, 1500, 2000];
    let attemptCount = 0;

    const attemptNavigation = () => {
      if (attemptCount < delays.length) {
        setTimeout(() => {
          const success = navigate(citation.messageId, { minimizeAIChat });
          if (!success) {
            attemptCount++;
            attemptNavigation();
          }
        }, delays[attemptCount]);
      }
    };

    attemptNavigation();
  };

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={handleClick}
        className={cn(
          "w-full text-left p-3 rounded-lg transition-all duration-200",
          highlighted 
            ? "bg-blue-600 hover:bg-blue-700 text-white citation-pop" 
            : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        aria-label={`View referenced message from ${citation.metadata.userName}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium truncate">
            {citation.metadata.userName}
          </span>
          <span className={cn(
            "text-xs whitespace-nowrap ml-2",
            highlighted ? "text-blue-100" : "text-gray-500"
          )}>
            {(citation.similarityScore * 100).toFixed(1)}%
          </span>
        </div>
        <p className={cn(
          "text-sm line-clamp-2",
          highlighted ? "text-blue-50" : "text-gray-700 dark:text-gray-300"
        )}>
          {citation.previewText}
        </p>
      </button>
      {showPreview && <ReferencePreview citation={citation} />}
    </div>
  );
}

function ReferenceList({ 
  messageId,
  citations, 
  minimizeAIChat,
  highlightedCitation,
  onNavigateToMessage,
  onHighlight,
  showAllCitations: externalShowAllCitations,
  setShowAllCitations: externalSetShowAllCitations
}: { 
  messageId: string;
  citations: Citation[]; 
  minimizeAIChat?: () => void;
  highlightedCitation?: {
    messageId: string;
    citationId: string;
  } | null;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
  onHighlight: (citationId: string) => void;
  showAllCitations?: boolean;
  setShowAllCitations?: (show: boolean) => void;
}) {
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const [internalShowAllCitations, setInternalShowAllCitations] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showAll = externalShowAllCitations ?? internalShowAllCitations;
  const setShowAll = externalSetShowAllCitations ?? setInternalShowAllCitations;

  const topCitations = citations.slice(0, 3);
  const remainingCitations = citations.slice(3);
  const hasMoreCitations = citations.length > 3;

  // Show all citations if a citation below the fold is highlighted for this message
  useEffect(() => {
    if (highlightedCitation?.messageId === messageId && 
        remainingCitations.some(c => c.id === highlightedCitation.citationId)) {
      setShowAll(true);
    }
  }, [highlightedCitation, messageId, remainingCitations, setShowAll]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {topCitations.map((citation) => (
          <CitationCard
            key={citation.id}
            citation={citation}
            minimizeAIChat={minimizeAIChat}
            onMouseEnter={() => setHoveredCitation(citation.id)}
            onMouseLeave={() => setHoveredCitation(null)}
            showPreview={hoveredCitation === citation.id}
            highlighted={highlightedCitation?.messageId === messageId && highlightedCitation?.citationId === citation.id}
            onNavigateToMessage={onNavigateToMessage}
            onHighlight={onHighlight}
          />
        ))}
      </div>

      {hasMoreCitations && (
        <>
          {!showAll ? (
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center justify-center w-full py-2 text-sm text-gray-600 dark:text-gray-300 
                       hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              <span className="mr-2">All Citations</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {remainingCitations.map((citation) => (
                  <CitationCard
                    key={citation.id}
                    citation={citation}
                    minimizeAIChat={minimizeAIChat}
                    onMouseEnter={() => setHoveredCitation(citation.id)}
                    onMouseLeave={() => setHoveredCitation(null)}
                    showPreview={hoveredCitation === citation.id}
                    highlighted={highlightedCitation?.messageId === messageId && highlightedCitation?.citationId === citation.id}
                    onNavigateToMessage={onNavigateToMessage}
                    onHighlight={onHighlight}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowAll(false)}
                className="flex items-center justify-center w-full py-2 text-sm text-gray-600 dark:text-gray-300 
                         hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                <span className="mr-2">Show Less</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CitationComponent({
  messageId,
  citations,
  references,
  minimizeAIChat,
  className,
  highlightedCitation,
  onNavigateToMessage,
  setHighlightedCitation,
  showAllCitations,
  setShowAllCitations
}: CitationComponentProps) {
  const handleHighlight = (citationId: string) => {
    // If clicking the same citation that's already highlighted, unhighlight it
    if (highlightedCitation?.messageId === messageId && highlightedCitation?.citationId === citationId) {
      setHighlightedCitation(null);
    } else {
      // Otherwise highlight the clicked citation
      setHighlightedCitation({ messageId, citationId });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <ReferenceList 
        messageId={messageId}
        citations={citations} 
        minimizeAIChat={minimizeAIChat} 
        highlightedCitation={highlightedCitation}
        onNavigateToMessage={onNavigateToMessage}
        onHighlight={handleHighlight}
        showAllCitations={showAllCitations}
        setShowAllCitations={setShowAllCitations}
      />
    </div>
  );
} 