// components/map/redesigned-map-info-sheet.tsx
'use client';

import { useState } from 'react';
import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Leaf, Square, Droplets, Sparkles, Sprout, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStatsCard } from './info-cards/quick-stats-card';
import { CompactFilterPills } from './info-cards/compact-filter-pills';
import { QuickActionsBar } from './info-cards/quick-actions-bar';

interface RedesignedMapInfoSheetProps {
  // Stats
  plantingCount: number;
  zoneCount: number;
  functionCount: number;

  // Filters
  layerFilters: Array<{ id: string; label: string; color: string; count: number }>;
  activeLayerFilters: string[];
  onToggleLayerFilter: (id: string) => void;

  vitalFilters: Array<{ id: string; label: string; count: number }>;
  activeVitalFilters: string[];
  onToggleVitalFilter: (id: string) => void;

  // Actions
  onAddPlant: () => void;
  onDrawZone: () => void;
  onWaterSystem: () => void;
  onBuildGuild: () => void;

  // Additional content
  children?: React.ReactNode;
}

export function RedesignedMapInfoSheet({
  plantingCount,
  zoneCount,
  functionCount,
  layerFilters,
  activeLayerFilters,
  onToggleLayerFilter,
  vitalFilters,
  activeVitalFilters,
  onToggleVitalFilter,
  onAddPlant,
  onDrawZone,
  onWaterSystem,
  onBuildGuild,
  children
}: RedesignedMapInfoSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'filters' | 'advanced'>('overview');

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-20',
        'bg-background/95 backdrop-blur-md',
        'border-t border-border',
        tokens.shadows.drawer,
        tokens.animation.slide
      )}
      data-map-info-sheet
    >
      {/* Collapsed Peek Bar */}
      {!isExpanded && (
        <div className="px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex-1 text-left"
          >
            <div className={tokens.typography.subtitle}>Map Info</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">🌱 {plantingCount}</span>
              <span className="text-xs text-muted-foreground">▢ {zoneCount}</span>
              <span className="hidden md:inline text-xs text-muted-foreground">⚡ {functionCount} functions</span>
            </div>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-7"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Header with section tabs */}
          <div className="border-b border-border bg-card/50">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex gap-1">
                <Button
                  variant={activeSection === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('overview')}
                  className="h-8 text-xs"
                >
                  Overview
                </Button>
                <Button
                  variant={activeSection === 'filters' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('filters')}
                  className="h-8 text-xs"
                >
                  Filters
                </Button>
                <Button
                  variant={activeSection === 'advanced' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('advanced')}
                  className="h-8 text-xs"
                >
                  Advanced
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-7"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="overflow-y-auto max-h-[60vh] overscroll-contain">
            <div className="p-4 space-y-3">
              {activeSection === 'overview' && (
                <>
                  <QuickActionsBar
                    actions={[
                      { id: 'plant', label: 'Add Plant', icon: Leaf, onClick: onAddPlant },
                      { id: 'zone', label: 'Draw Zone', icon: Square, onClick: onDrawZone },
                      { id: 'water', label: 'Water System', icon: Droplets, onClick: onWaterSystem },
                      { id: 'guild', label: 'Build Guild', icon: Sparkles, onClick: onBuildGuild }
                    ]}
                  />

                  <QuickStatsCard
                    title="Farm Overview"
                    stats={[
                      { label: 'Plantings', value: plantingCount, icon: Sprout, color: 'success' },
                      { label: 'Zones', value: zoneCount, icon: Square, color: 'info' },
                      { label: 'Functions', value: functionCount, icon: Activity, color: 'warning' },
                      { label: 'Coverage', value: '78%', icon: TrendingUp, color: 'success' }
                    ]}
                  />
                </>
              )}

              {activeSection === 'filters' && (
                <>
                  <CompactFilterPills
                    title="Layer Filters"
                    filters={layerFilters}
                    activeFilters={activeLayerFilters}
                    onToggle={onToggleLayerFilter}
                    onClearAll={() => {
                      activeLayerFilters.forEach(id => onToggleLayerFilter(id));
                    }}
                  />

                  <CompactFilterPills
                    title="Function Filters"
                    filters={vitalFilters}
                    activeFilters={activeVitalFilters}
                    onToggle={onToggleVitalFilter}
                    onClearAll={() => {
                      activeVitalFilters.forEach(id => onToggleVitalFilter(id));
                    }}
                  />
                </>
              )}

              {activeSection === 'advanced' && (
                <div className="space-y-4">
                  {children}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
