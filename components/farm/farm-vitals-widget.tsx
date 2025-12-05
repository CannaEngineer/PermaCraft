'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { FarmVitals } from './farm-vitals';
import { Button } from '@/components/ui/button';

interface PlantingWithSpecies {
  id: string;
  species_id: string;
  common_name?: string;
  permaculture_functions?: string | null;
}

interface FarmVitalsWidgetProps {
  plantings: PlantingWithSpecies[];
  className?: string;
}

/**
 * Collapsible Farm Vitals Widget
 *
 * Displays ecological function tallies in a collapsible panel.
 * - Desktop: Slides down from header
 * - Mobile: Collapsible panel below header
 */
export function FarmVitalsWidget({ plantings, className = '' }: FarmVitalsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (plantings.length === 0) {
    return null; // Don't show widget if no plantings
  }

  return (
    <div className={`bg-muted/30 border-b border-border ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle farm vitals dashboard"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Farm Vitals</span>
          <span className="text-xs text-muted-foreground">
            ({plantings.length} plants)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 border-t border-border overflow-y-auto max-h-[750px]">
          <FarmVitals plantings={plantings} />
        </div>
      </div>
    </div>
  );
}
