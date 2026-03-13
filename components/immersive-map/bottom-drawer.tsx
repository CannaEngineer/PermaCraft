"use client";

import { useImmersiveMapUI, type BottomDrawerTab } from "@/contexts/immersive-map-ui-context";
import { motion, PanInfo } from "framer-motion";
import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Plus, PenTool, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomDrawerProps {
  /** Content for each tab */
  designContent?: ReactNode;
  manageContent?: ReactNode;
  storyContent?: ReactNode;
  /** Content for detail overlays (annotations, species picker, etc.) */
  detailContent?: ReactNode;
  /** Story draft count for badge */
  storyDraftCount?: number;
  /** Callbacks */
  onAddPlant?: () => void;
  onDrawZone?: () => void;
}

export function BottomDrawer({
  designContent,
  manageContent,
  storyContent,
  detailContent,
  storyDraftCount = 0,
  onAddPlant,
  onDrawZone,
}: BottomDrawerProps) {
  const {
    drawerContent, drawerHeight, closeDrawer, setDrawerHeight,
    activeTab, setActiveTab,
    zoneLinkMode, setZoneLinkMode,
    enterDrawingMode,
  } = useImmersiveMapUI();
  const dragConstraintsRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [isOpen, setIsOpen] = useState(true);

  // Store height before drawing mode so we can restore
  const preDrawHeightRef = useRef<'peek' | 'medium' | 'max'>('medium');

  const heightMap = isMobile
    ? { peek: '60px', medium: '45vh', max: '90vh' }
    : { peek: '60px', medium: '55vh', max: '85vh' };

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

  return (
    <>
      {/* Drawer — always visible, minimum peek height */}
      <motion.div
        ref={dragConstraintsRef}
        animate={{ height: heightMap[drawerHeight] }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="fixed inset-x-0 bottom-0 z-[55] bg-background/95 backdrop-blur-xl rounded-t-2xl border-t border-border/40 shadow-2xl flex flex-col overflow-hidden"
        style={{ willChange: 'height' }}
        data-bottom-drawer
      >
        {/* Peek Bar — always visible */}
        <div className="flex-shrink-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Tab bar + action buttons */}
          <div className="flex items-center justify-between px-3 pb-2">
            {/* Tabs */}
            <div className="flex gap-1">
              {(['design', 'manage', 'story'] as BottomDrawerTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (drawerHeight === 'peek') setDrawerHeight('medium');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors relative ${
                    activeTab === tab && !showDetailOverlay
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'story' && storyDraftCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {storyDraftCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5">
              {zoneLinkMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCancelZoneLink}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onAddPlant}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Plant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDrawZone}
                  >
                    <PenTool className="h-3 w-3 mr-1" />
                    Draw Zone
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab content — scrollable area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {renderTabContent()}
        </div>
      </motion.div>
    </>
  );
}
