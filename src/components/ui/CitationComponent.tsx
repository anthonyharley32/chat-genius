'use client';

import { useState } from 'react';
import { Citation, CitationReference } from '@/types/citations';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMessageNavigation } from '@/utils/messageNavigation';

interface CitationComponentProps {
  citations: Citation[];
  references: CitationReference[];
  minimizeAIChat?: () => void;
  className?: string;
  highlightedCitationId?: string;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
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
  onNavigateToMessage
}: { 
  citation: Citation;
  minimizeAIChat?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showPreview: boolean;
  highlighted?: boolean;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
}) {
  const { navigate } = useMessageNavigation();

  const handleClick = () => {
    // First navigate to the channel/DM
    onNavigateToMessage(
      citation.messageId,
      citation.metadata.channelId || null,
      citation.metadata.isDirectMessage ? citation.metadata.userId : null
    );

    // Then minimize AI chat
    if (minimizeAIChat) {
      minimizeAIChat();
    }

    // Wait for the messages to load and render
    setTimeout(() => {
      const success = navigate(citation.messageId, { minimizeAIChat });
      if (!success) {
        // If first attempt fails, try again after another delay
        setTimeout(() => {
          const retrySuccess = navigate(citation.messageId, { minimizeAIChat });
          if (!retrySuccess) {
            console.warn(`Could not navigate to message ${citation.messageId} - element not found`);
          }
        }, 200);
      }
    }, 300);
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
  citations, 
  minimizeAIChat,
  highlightedCitationId,
  onNavigateToMessage
}: { 
  citations: Citation[]; 
  minimizeAIChat?: () => void;
  highlightedCitationId?: string;
  onNavigateToMessage: (messageId: string, channelId: string | null, userId: string | null) => void;
}) {
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const [showAllCitations, setShowAllCitations] = useState(false);

  const topCitations = citations.slice(0, 3);
  const remainingCitations = citations.slice(3);
  const hasMoreCitations = citations.length > 3;

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
            highlighted={citation.id === highlightedCitationId}
            onNavigateToMessage={onNavigateToMessage}
          />
        ))}
      </div>

      {hasMoreCitations && (
        <>
          {!showAllCitations ? (
            <button
              onClick={() => setShowAllCitations(true)}
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
                    highlighted={citation.id === highlightedCitationId}
                    onNavigateToMessage={onNavigateToMessage}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowAllCitations(false)}
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
  citations,
  references,
  minimizeAIChat,
  className,
  highlightedCitationId,
  onNavigateToMessage
}: CitationComponentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <ReferenceList 
        citations={citations} 
        minimizeAIChat={minimizeAIChat} 
        highlightedCitationId={highlightedCitationId}
        onNavigateToMessage={onNavigateToMessage}
      />
    </div>
  );
} 