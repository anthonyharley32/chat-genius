'use client';

import { useState } from 'react';
import { Citation, CitationReference } from '@/types/citations';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CitationComponentProps {
  citations: Citation[];
  references: CitationReference[];
  onMessageClick: (messageId: string) => void;
  className?: string;
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
  onMessageClick,
  onMouseEnter,
  onMouseLeave,
  showPreview
}: { 
  citation: Citation;
  onMessageClick: (messageId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showPreview: boolean;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={() => onMessageClick(citation.messageId)}
        className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 
                 dark:hover:bg-gray-700 transition-colors duration-200"
        aria-label={`View referenced message from ${citation.metadata.userName}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium truncate">
            {citation.metadata.userName}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
            {(citation.similarityScore * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {citation.previewText}
        </p>
      </button>
      {showPreview && <ReferencePreview citation={citation} />}
    </div>
  );
}

function ReferenceList({ 
  citations, 
  onMessageClick 
}: { 
  citations: Citation[]; 
  onMessageClick: (messageId: string) => void;
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
            onMessageClick={onMessageClick}
            onMouseEnter={() => setHoveredCitation(citation.id)}
            onMouseLeave={() => setHoveredCitation(null)}
            showPreview={hoveredCitation === citation.id}
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
                    onMessageClick={onMessageClick}
                    onMouseEnter={() => setHoveredCitation(citation.id)}
                    onMouseLeave={() => setHoveredCitation(null)}
                    showPreview={hoveredCitation === citation.id}
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
  onMessageClick,
  className
}: CitationComponentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="prose dark:prose-invert max-w-none">
        {references.map((ref) => (
          <button
            key={ref.citationId}
            onClick={() => {
              const citation = citations.find(c => c.id === ref.citationId);
              if (citation) onMessageClick(citation.messageId);
            }}
            className="inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-900/30 
                     text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/30 
                     transition-colors duration-200 text-sm"
            aria-label={`View citation ${ref.referenceText}`}
          >
            [{ref.referenceText}]
          </button>
        ))}
      </div>
      <ReferenceList citations={citations} onMessageClick={onMessageClick} />
    </div>
  );
} 