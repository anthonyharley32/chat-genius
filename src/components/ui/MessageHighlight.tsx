'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface HighlightProps {
  isHighlighted: boolean;
  duration?: number; // in milliseconds
  children: React.ReactNode;
}

export function MessageHighlight({ 
  isHighlighted, 
  duration = 2000, 
  children 
}: HighlightProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, duration]);

  return (
    <div
      className={cn(
        'transition-colors duration-500 ease-in-out rounded-lg',
        isAnimating && 'bg-yellow-100 dark:bg-yellow-900/30'
      )}
    >
      {children}
    </div>
  );
} 