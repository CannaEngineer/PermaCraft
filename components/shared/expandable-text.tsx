'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  expandLabel?: string;
  collapseLabel?: string;
  showCollapseButton?: boolean;
  preserveFormatting?: boolean;
}

export function ExpandableText({
  text,
  maxLength = 500,
  className = '',
  expandLabel = 'Dive Deeper',
  collapseLabel = 'Show Less',
  showCollapseButton = true,
  preserveFormatting = true
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't truncate if text is shorter than maxLength
  const shouldTruncate = text.length > maxLength;

  // Truncate at word boundary, not mid-word
  const truncateAtWord = (str: string, max: number) => {
    if (str.length <= max) return str;
    const truncated = str.slice(0, max);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  };

  const displayText = isExpanded ? text : truncateAtWord(text, maxLength);

  if (!shouldTruncate) {
    return (
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap', className)}>
        {text}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap')}>
        {displayText}
        {!isExpanded && '...'}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 h-8 text-primary hover:text-primary/80 hover:bg-primary/10"
        aria-label={isExpanded ? 'Collapse text' : 'Expand text'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            {showCollapseButton && (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                {collapseLabel}
              </>
            )}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            {expandLabel}
          </>
        )}
      </Button>
    </div>
  );
}
