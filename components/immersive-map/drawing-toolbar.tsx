"use client";

import { useState, useRef, useEffect } from "react";
import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Square, Circle, MapPin, Edit, Trash2, Check, Minus, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ZONE_TYPES, ZONE_TYPE_CATEGORIES } from "@/lib/map/zone-types";

interface DrawingToolbarProps {
  onToolSelect: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => void;
  onZoneTypeClick: () => void;
  currentZoneType: string;
  onZoneTypeChange?: (zoneType: string) => void;
}

/**
 * Simplified zone type categories for initial selection (6 instead of 22+).
 * Users pick a category first; subtypes available on edit.
 */
const SIMPLIFIED_ZONE_CATEGORIES = [
  { label: "Permaculture Zone", types: ["zone_0", "zone_1", "zone_2", "zone_3", "zone_4", "zone_5"] },
  { label: "Water Feature", types: ["water_body", "water_flow", "swale", "pond"] },
  { label: "Structure", types: ["structure", "path", "fence"] },
  { label: "Food Forest / Agroforestry", types: ["food_forest", "silvopasture", "alley_crop", "windbreak"] },
  { label: "Garden / Farm Area", types: ["annual_garden", "orchard", "pasture", "woodland"] },
  { label: "Other", types: ["other"] },
];

export function DrawingToolbar({
  onToolSelect,
  currentZoneType,
  onZoneTypeChange,
}: DrawingToolbarProps) {
  const { drawingMode, activeDrawTool, setActiveDrawTool, exitDrawingMode } = useImmersiveMapUI();
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close selector when clicking outside
  useEffect(() => {
    if (!showZoneSelector) return;
    const handleClick = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowZoneSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showZoneSelector]);

  if (!drawingMode) return null;

  const handleToolClick = (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => {
    setActiveDrawTool(tool);
    onToolSelect(tool);
  };

  const handleZoneTypeSelect = (zoneType: string) => {
    onZoneTypeChange?.(zoneType);
    setShowZoneSelector(false);
    setExpandedCategory(null);
  };

  const currentConfig = ZONE_TYPES[currentZoneType] || ZONE_TYPES.other;

  const tools = [
    { id: 'polygon' as const, icon: Square, label: 'Draw Polygon' },
    { id: 'line' as const, icon: Minus, label: 'Draw Line' },
    { id: 'circle' as const, icon: Circle, label: 'Draw Circle' },
    { id: 'point' as const, icon: MapPin, label: 'Add Point' },
    { id: 'edit' as const, icon: Edit, label: 'Edit Shape' },
    { id: 'delete' as const, icon: Trash2, label: 'Delete' },
  ];

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-4 bottom-20 md:bottom-8 z-30 glass-panel rounded-2xl p-2 flex flex-col gap-2"
    >
      {/* Zone Type Selector — full name + color swatch instead of 2-letter code */}
      <div ref={selectorRef} className="relative">
        <Button
          onClick={() => setShowZoneSelector(!showZoneSelector)}
          variant="outline"
          className="w-full h-10 rounded-xl px-3 flex items-center gap-2 text-left"
          title="Select Zone Type"
        >
          <div
            className="w-4 h-4 rounded-sm border border-border/50 flex-shrink-0"
            style={{ backgroundColor: currentConfig.fillColor, opacity: 0.8 }}
          />
          <span className="text-xs font-medium truncate flex-1">{currentConfig.label}</span>
          <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${showZoneSelector ? 'rotate-180' : ''}`} />
        </Button>

        {/* Zone Type Dropdown */}
        <AnimatePresence>
          {showZoneSelector && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-2 bottom-0 w-56 max-h-[70vh] overflow-y-auto glass-panel-strong rounded-xl border border-border/40 shadow-xl p-1.5 z-50"
            >
              {SIMPLIFIED_ZONE_CATEGORIES.map((category) => (
                <div key={category.label} className="mb-0.5">
                  <button
                    onClick={() => {
                      if (category.types.length === 1) {
                        handleZoneTypeSelect(category.types[0]);
                      } else {
                        setExpandedCategory(expandedCategory === category.label ? null : category.label);
                      }
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent/50 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <div className="flex gap-0.5">
                      {category.types.slice(0, 3).map(t => (
                        <div
                          key={t}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: ZONE_TYPES[t]?.fillColor || '#64748b' }}
                        />
                      ))}
                    </div>
                    <span className="flex-1">{category.label}</span>
                    {category.types.length > 1 && (
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedCategory === category.label ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* Subtypes */}
                  <AnimatePresence>
                    {expandedCategory === category.label && category.types.length > 1 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-3 py-0.5">
                          {category.types.map(typeKey => {
                            const config = ZONE_TYPES[typeKey];
                            if (!config) return null;
                            const isSelected = currentZoneType === typeKey;
                            return (
                              <button
                                key={typeKey}
                                onClick={() => handleZoneTypeSelect(typeKey)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${
                                  isSelected
                                    ? 'bg-primary/15 text-primary font-medium'
                                    : 'hover:bg-accent/40'
                                }`}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded-sm border border-black/10"
                                  style={{ backgroundColor: config.fillColor }}
                                />
                                <span>{config.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-px bg-border/30 my-1" />

      {/* Drawing Tools */}
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeDrawTool === tool.id;

        return (
          <Button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            variant={isActive ? "default" : "ghost"}
            size="icon"
            className={`w-12 h-12 rounded-xl ${
              isActive ? 'shadow-lg' : ''
            }`}
            title={tool.label}
          >
            <Icon className="h-5 w-5" />
          </Button>
        );
      })}

      <div className="h-px bg-border/30 my-1" />

      {/* Done Button */}
      <Button
        onClick={exitDrawingMode}
        variant="default"
        size="icon"
        className="w-12 h-12 rounded-xl bg-green-600 hover:bg-green-700"
        title="Done — exit drawing mode (Esc)"
      >
        <Check className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
