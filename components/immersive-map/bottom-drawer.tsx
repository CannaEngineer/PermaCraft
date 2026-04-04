"use client";

import { useImmersiveMapUI, type BottomDrawerTab } from "@/contexts/immersive-map-ui-context";
import { motion, PanInfo } from "framer-motion";
import { ReactNode, useRef, useCallback } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Plus, PenTool, X, Leaf, Map, MapPin, FlaskConical, Camera } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design/design-system";

interface BottomDrawerProps {
  /** Content for each tab */
  designContent?: ReactNode;
  manageContent?: ReactNode;
  storyContent?: ReactNode;
  /** Content for detail overlays (annotations, species picker, etc.) */
  detailContent?: ReactNode;
  /** Story draft count for badge */
  storyDraftCount?: number;
  /** Summary counts for peek bar */
  plantingCount?: number;
  zoneCount?: number;
  /** Callbacks */
  onAddPlant?: () => void;
  onDrawZone?: () => void;
  /** GPS callbacks */
  onGPSDropPin?: () => void;
  onGPSSoilTest?: () => void;
  onGPSPhoto?: () => void;
  onGPSWalkBoundary?: () => void;
}

const TAB_CONFIG: { id: BottomDrawerTab; label: string; icon: typeof Leaf }[] = [
  { id: 'design', label: 'Features', icon: Map },
  { id: 'manage', label: 'Plan', icon: Leaf },
  { id: 'story', label: 'Story', icon: Leaf },
];

export function BottomDrawer({
  designContent,
  manageContent,
  storyContent,
  detailContent,
  storyDraftCount = 0,
  plantingCount = 0,
  zoneCount = 0,
  onAddPlant,
  onDrawZone,
  onGPSDropPin,
  onGPSSoilTest,
  onGPSPhoto,
  onGPSWalkBoundary,
}: BottomDrawerProps) {
  const {
    drawerContent, drawerHeight, setDrawerHeight,
    activeTab, setActiveTab,
    zoneLinkMode, setZoneLinkMode,
    enterDrawingMode,
  } = useImmersiveMapUI();
  const dragConstraintsRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Store height before drawing mode so we can restore
  const preDrawHeightRef = useRef<'peek' | 'medium' | 'max'>('medium');

  const heightMap = isMobile
    ? { peek: '56px', medium: '48vh', max: '90vh' }
    : { peek: '56px', medium: '50vh', max: '85vh' };

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500) {
      setDrawerHeight('peek');
      return;
    }

    if (offset > 100) {
      if (drawerHeight === 'max') setDrawerHeight('medium');
      else if (drawerHeight === 'medium') setDrawerHeight('peek');
    } else if (offset < -100) {
      if (drawerHeight === 'peek') setDrawerHeight('medium');
      else if (drawerHeight === 'medium') setDrawerHeight('max');
    }
  };

  const handleDrawZone = useCallback(() => {
    preDrawHeightRef.current = drawerHeight;
    setDrawerHeight('peek');
    enterDrawingMode();
    onDrawZone?.();
  }, [drawerHeight, setDrawerHeight, enterDrawingMode, onDrawZone]);

  const handleCancelZoneLink = useCallback(() => {
    setZoneLinkMode(false);
    setDrawerHeight(preDrawHeightRef.current);
  }, [setZoneLinkMode, setDrawerHeight]);

  // Determine if we're showing a detail overlay (species picker, annotations, etc.)
  const showDetailOverlay = drawerContent && drawerContent !== 'feature-list';

  // Tab content rendering
  const renderTabContent = () => {
    if (showDetailOverlay && detailContent) {
      return detailContent;
    }

    switch (activeTab) {
      case 'design':
        return designContent;
      case 'manage':
        return manageContent;
      case 'story':
        return storyContent;
      default:
        return null;
    }
  };

  const isPeek = drawerHeight === 'peek';

  return (
    <motion.div
      ref={dragConstraintsRef}
      animate={{ height: heightMap[drawerHeight] }}
      transition={{
        type: 'spring',
        ...DESIGN_TOKENS.spring.snappy,
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      className="fixed inset-x-0 bottom-0 md:bottom-0 z-[55] flex flex-col overflow-hidden rounded-t-2xl border-t border-border/30 bg-background/85 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_-4px_32px_rgba(0,0,0,0.08)] max-md:bottom-14"
      style={{ willChange: 'height' }}
      data-bottom-drawer
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
        <div className="w-9 h-[3px] bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Header: tabs + actions — always visible */}
      <div className="flex items-center gap-2 px-4 pb-2 flex-shrink-0">
        {/* Segmented control tabs */}
        <div className="flex items-center bg-muted/40 rounded-lg p-0.5 flex-1 min-w-0">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id && !showDetailOverlay;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isPeek) setDrawerHeight('medium');
                }}
                className={`
                  relative flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {tab.label}
                {tab.id === 'story' && storyDraftCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 h-3.5 min-w-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {storyDraftCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {zoneLinkMode ? (
            <button
              onClick={handleCancelZoneLink}
              className="flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={onAddPlant}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors active:scale-95 shadow-sm"
                title="Add plant at GPS location"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Plant</span>
              </button>
              <button
                onClick={handleDrawZone}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium bg-muted/60 hover:bg-muted text-foreground transition-colors active:scale-95"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Draw</span>
              </button>
              {onGPSDropPin && (
                <button
                  onClick={onGPSDropPin}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors active:scale-95 shadow-sm"
                  title="Drop GPS pin"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pin</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab content — scrollable area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {renderTabContent()}
      </div>
    </motion.div>
  );
}
