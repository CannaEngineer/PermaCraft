"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Leaf, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FarmVitals } from "@/components/farm/farm-vitals";
import { FeatureListPanel } from "./feature-list-panel";
import { MAP_INFO_TOKENS as tokens } from "@/lib/design/map-info-tokens";
import { cn } from "@/lib/utils";


interface MapBottomDrawerProps {
  zones: any[];
  plantings?: any[];
  lines?: any[];
  guilds?: any[];
  phases?: any[];

  // Vitals props
  onGetRecommendations?: (vitalKey: string, vitalLabel: string, currentCount: number, plantList: any[]) => void;

  // Design + Farm actions (unified)
  onAddPlant?: () => void;
  onDrawZone?: () => void;
  // Feature List props
  onFeatureSelectFromList?: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef?: React.RefObject<any>;
}

export function MapBottomDrawer({
  zones,
  plantings = [],
  lines = [],
  guilds = [],
  phases = [],
  onGetRecommendations,
  onAddPlant,
  onDrawZone,
  onFeatureSelectFromList,
  mapRef,
}: MapBottomDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showVitals, setShowVitals] = useState(false);

  const lowVitalCount = useMemo(() => {
    if (plantings.length === 0) return 0;
    const functionCounts: Record<string, number> = {};
    plantings.forEach((planting: any) => {
      if (!planting.permaculture_functions) return;
      try {
        const functions: string[] = JSON.parse(planting.permaculture_functions);
        functions.forEach((fn) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
      } catch {
        // Ignore parse errors
      }
    });
    const highImportanceFunctions = [
      'nitrogen_fixer', 'nitrogen_fixing',
      'pollinator_support', 'pollinator', 'pollinator_attractor',
      'edible_fruit', 'edible_nuts', 'edible'
    ];
    return highImportanceFunctions.filter(fn => !functionCounts[fn]).length > 0 ? 1 : 0;
  }, [plantings]);

  const nonBoundaryZoneCount = useMemo(() => {
    return zones.filter((z: any) => z.zone_type !== 'farm_boundary').length;
  }, [zones]);

  return (
    <div
      className={cn(
        "absolute bottom-14 md:bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/30 text-xs z-20 rounded-t-2xl shadow-[0_-4px_32px_rgba(0,0,0,0.08)]",
        tokens.animation.slide,
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      )}
      data-bottom-drawer
      data-collapsed={isCollapsed}
    >
      {/* Peek Bar - Always Visible When Collapsed */}
      {isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/30 rounded-t-2xl shadow-[0_-4px_32px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-4 py-2.5 min-h-[48px]">
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors min-w-0 flex-1"
              aria-label="Expand map info drawer"
            >
              <span className="text-muted-foreground text-xs">
                <Leaf className="inline h-3.5 w-3.5 mr-1" />
                {plantings.length} {plantings.length === 1 ? 'plant' : 'plants'}
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span className="text-muted-foreground text-xs">
                {nonBoundaryZoneCount} {nonBoundaryZoneCount === 1 ? 'zone' : 'zones'}
              </span>
              {lowVitalCount > 0 && plantings.length > 0 && (
                <Badge
                  onClick={(e) => { e.stopPropagation(); setIsCollapsed(false); setShowVitals(true); }}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent text-[10px] shrink-0 border-amber-400 text-amber-700 dark:text-amber-300"
                >
                  Diversify
                </Badge>
              )}
            </button>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {onAddPlant && (
                <button
                  onClick={onAddPlant}
                  className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Leaf className="h-3 w-3" />
                  Plant
                </button>
              )}
              {onDrawZone && (
                <button
                  onClick={onDrawZone}
                  className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  <Square className="h-3 w-3" />
                  Zone
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                aria-label="Expand"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Visible When Expanded (no tabs, just title + collapse) */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
          <span className="text-sm font-medium text-foreground">Features</span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors shrink-0"
            aria-label="Collapse"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content — single scrollable panel */}
      {!isCollapsed && (
        <div className="overflow-y-auto max-h-[60vh] overscroll-contain">
          {/* Vitals summary (collapsible, shown when plants exist) */}
          {plantings.length > 0 && (
            <div className="border-b border-border/30">
              <button
                onClick={() => setShowVitals(!showVitals)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  Ecosystem Health
                  {lowVitalCount > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] border-amber-400 text-amber-700 dark:text-amber-300"
                    >
                      Needs attention
                    </Badge>
                  )}
                </span>
                <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", showVitals && "rotate-180")} />
              </button>
              {showVitals && (
                <div className="px-4 pb-3">
                  <FarmVitals
                    plantings={plantings}
                    onGetRecommendations={onGetRecommendations}
                  />
                </div>
              )}
            </div>
          )}

          {/* Feature List */}
          {onFeatureSelectFromList && mapRef ? (
            <FeatureListPanel
              zones={zones}
              plantings={plantings}
              lines={lines}
              guilds={guilds}
              phases={phases}
              onFeatureSelect={onFeatureSelectFromList}
              mapRef={mapRef}
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Feature list not available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
