"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Square, Circle, MapPin, Edit, Trash2, Check, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface DrawingToolbarProps {
  onToolSelect: (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => void;
  onZoneTypeClick: () => void;
  currentZoneType: string;
}

export function DrawingToolbar({
  onToolSelect,
  onZoneTypeClick,
  currentZoneType,
}: DrawingToolbarProps) {
  const { drawingMode, activeDrawTool, setActiveDrawTool, exitDrawingMode } = useImmersiveMapUI();

  if (!drawingMode) return null;

  const handleToolClick = (tool: 'polygon' | 'circle' | 'point' | 'edit' | 'delete' | 'line') => {
    setActiveDrawTool(tool);
    onToolSelect(tool);
  };

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
      className="fixed left-4 bottom-20 md:bottom-8 top-auto md:top-auto translate-y-0 md:translate-y-0 z-30 glass-panel rounded-2xl p-2 flex flex-col gap-2 w-16"
    >
      {/* Zone Type Button */}
      <Button
        onClick={onZoneTypeClick}
        variant="outline"
        size="icon"
        className="w-12 h-12 rounded-xl"
        title="Select Zone Type"
      >
        <span className="text-xs font-semibold">{currentZoneType.substring(0, 2).toUpperCase()}</span>
      </Button>

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
        title="Exit Drawing Mode"
      >
        <Check className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
