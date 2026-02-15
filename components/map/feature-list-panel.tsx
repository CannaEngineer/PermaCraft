'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FeatureListPanelProps {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<any>;
}

type ViewMode = 'type' | 'layer' | 'phase';

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar - TODO */}
        <div className="text-sm text-muted-foreground">
          Search bar coming soon
        </div>

        {/* View Tabs - TODO */}
        <div className="text-sm text-muted-foreground">
          View tabs coming soon
        </div>

        {/* Feature List - TODO */}
        <div className="text-sm text-muted-foreground">
          Feature list coming soon
        </div>
      </div>
    </div>
  );
}
