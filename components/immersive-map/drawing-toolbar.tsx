"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import {
  Square, Circle, MapPin, Edit, Trash2, Check, Minus,
  ChevronDown, ChevronUp, Undo2, X,
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ZONE_TYPES,
  ZONE_TYPE_CATEGORIES,
  ZONE_CATEGORY_ICONS,
  ZONE_CATEGORY_DESCRIPTIONS,
} from "@/lib/map/zone-types";
import { DESIGN_TOKENS } from "@/lib/design/design-system";

interface DrawingToolbarProps {
  onToolSelect: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => void;
  onZoneTypeClick: () => void;
  currentZoneType: string;
  onZoneTypeChange?: (zoneType: string) => void;
  onUndo?: () => void;
}

export function DrawingToolbar({
  onToolSelect,
  currentZoneType,
  onZoneTypeChange,
  onUndo,
}: DrawingToolbarProps) {
  const { drawingMode, activeDrawTool, setActiveDrawTool, exitDrawingMode } = useImmersiveMapUI();
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showZonePicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowZonePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showZonePicker]);

  // Close picker on Escape
  useEffect(() => {
    if (!showZonePicker) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowZonePicker(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showZonePicker]);

  if (!drawingMode) return null;

  const handleToolClick = (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => {
    setActiveDrawTool(tool);
    onToolSelect(tool);
  };

  const handleZoneTypeSelect = (zoneType: string) => {
    onZoneTypeChange?.(zoneType);
    setShowZonePicker(false);
    setExpandedCategory(null);
  };

  const handlePickerDragEnd = (_: any, info: PanInfo) => {
    if (info.velocity.y > 400 || info.offset.y > 120) {
      setShowZonePicker(false);
    }
  };

  const currentConfig = ZONE_TYPES[currentZoneType] || ZONE_TYPES.other;

  const tools = [
    { id: 'polygon' as const, icon: Square, label: 'Polygon' },
    { id: 'line' as const, icon: Minus, label: 'Line' },
    { id: 'circle' as const, icon: Circle, label: 'Circle' },
    { id: 'point' as const, icon: MapPin, label: 'Point' },
  ];

  const editTools = [
    { id: 'edit' as const, icon: Edit, label: 'Edit' },
    { id: 'delete' as const, icon: Trash2, label: 'Delete' },
  ];

  return (
    <>
      {/* ── Main Toolbar ─────────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', ...DESIGN_TOKENS.spring.snappy }}
        className="fixed left-0 right-0 bottom-16 md:bottom-0 z-[60] px-3 pb-3 md:px-4 md:pb-4 pointer-events-none"
      >
        <div className="pointer-events-auto max-w-lg mx-auto bg-background/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] p-2">
          {/* Zone Type Selector — full-width, prominent */}
          <button
            onClick={() => setShowZonePicker(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted/70 active:bg-muted transition-colors mb-2"
          >
            <div
              className="w-5 h-5 rounded-md border border-black/10 flex-shrink-0"
              style={{ backgroundColor: currentConfig.fillColor }}
            />
            <div className="flex-1 text-left min-w-0">
              <span className="text-sm font-medium truncate block">{currentConfig.label}</span>
              {currentConfig.description && (
                <span className="text-[11px] text-muted-foreground truncate block">{currentConfig.description}</span>
              )}
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Drawing Tools — horizontal scroll */}
          <div className="flex items-center gap-1.5">
            {/* Shape tools */}
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeDrawTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-14 rounded-xl transition-all active:scale-95 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                  }`}
                  title={tool.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">{tool.label}</span>
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-px h-8 bg-border/50 mx-0.5 flex-shrink-0" />

            {/* Edit / Delete */}
            {editTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeDrawTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-14 rounded-xl transition-all active:scale-95 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                  }`}
                  title={tool.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">{tool.label}</span>
                </button>
              );
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Done button */}
            <button
              onClick={exitDrawingMode}
              className="flex items-center justify-center h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition-colors active:scale-95 shadow-md"
              title="Done (Esc)"
            >
              <Check className="h-4.5 w-4.5 mr-1.5" />
              Done
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Zone Type Picker (Bottom Sheet) ──────── */}
      <AnimatePresence>
        {showZonePicker && (
          <>
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-[65]"
              onClick={() => setShowZonePicker(false)}
            />

            {/* Sheet */}
            <motion.div
              ref={pickerRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', ...DESIGN_TOKENS.spring.snappy }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={handlePickerDragEnd}
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[75vh] flex flex-col bg-background rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] overflow-hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-muted-foreground/25 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <h2 className="text-base font-semibold">Choose Zone Type</h2>
                <button
                  onClick={() => setShowZonePicker(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable categories */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8"
                style={{ touchAction: 'pan-y' }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {Object.entries(ZONE_TYPE_CATEGORIES).map(([category, types]) => {
                  if (category === 'Other' && types.length === 1) {
                    // Render "Other" as a single inline button
                    const config = ZONE_TYPES[types[0]];
                    if (!config) return null;
                    return (
                      <button
                        key={category}
                        onClick={() => handleZoneTypeSelect(types[0])}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-colors ${
                          currentZoneType === types[0] ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-md border border-black/10"
                          style={{ backgroundColor: config.fillColor }}
                        />
                        <span className="text-sm font-medium">Other</span>
                      </button>
                    );
                  }

                  const isExpanded = expandedCategory === category;
                  const hasSelectedChild = types.includes(currentZoneType);

                  return (
                    <div key={category} className="mb-1">
                      {/* Category header */}
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                          isExpanded ? 'bg-muted/60' : hasSelectedChild ? 'bg-primary/5' : 'hover:bg-muted/40'
                        }`}
                      >
                        {/* Color dots preview */}
                        <div className="flex -space-x-1">
                          {types.slice(0, 4).map(t => (
                            <div
                              key={t}
                              className="w-4 h-4 rounded-full border-2 border-background"
                              style={{ backgroundColor: ZONE_TYPES[t]?.fillColor || '#64748b' }}
                            />
                          ))}
                        </div>

                        <div className="flex-1 text-left">
                          <span className="text-sm font-medium">{category}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">
                            {ZONE_CATEGORY_DESCRIPTIONS[category]}
                          </span>
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Expanded zone type list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-1.5 px-1 pt-1.5 pb-1">
                              {types.map(typeKey => {
                                const config = ZONE_TYPES[typeKey];
                                if (!config) return null;
                                const isSelected = currentZoneType === typeKey;

                                return (
                                  <button
                                    key={typeKey}
                                    onClick={() => handleZoneTypeSelect(typeKey)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all active:scale-[0.97] ${
                                      isSelected
                                        ? 'bg-primary/12 ring-1.5 ring-primary/40 shadow-sm'
                                        : 'hover:bg-muted/50 active:bg-muted/70'
                                    }`}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-md border border-black/10 flex-shrink-0"
                                      style={{ backgroundColor: config.fillColor }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-xs block truncate ${isSelected ? 'font-semibold text-primary' : 'font-medium'}`}>
                                        {config.label}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
