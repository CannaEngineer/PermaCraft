'use client';

import { useState, useRef } from 'react';
import { Plus, X, Leaf, Square, MapPin, Waves, Sparkles, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';

interface MapFABProps {
  onAddPlant: () => void;
  onWaterSystem: () => void;
  onBuildGuild: () => void;
  onTimeline: () => void;
  onJournalEntry?: () => void;
  onFarmInfo?: () => void;
}

interface FABMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

/**
 * Single Floating Action Button — Google Material 3 / Apple HIG pattern.
 *
 * One green "+" button that expands into a speed dial with contextual actions.
 * - AI Chat button removed (already in header — always accessible)
 * - Design actions merged into one unified speed dial
 * - Auto-hides during drawing, chatting, and when drawer is open (viewing mode)
 * - Smooth staggered animation on expand
 * - Backdrop dismiss on tap outside
 */
export function MapFAB({ onAddPlant, onWaterSystem, onBuildGuild, onTimeline }: MapFABProps) {
  const { enterDrawingMode, setActiveDrawTool, uiMode } = useImmersiveMapUI();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide FAB during drawing, chatting, or when drawer is open
  if (uiMode !== 'idle') return null;

  const close = () => setIsOpen(false);

  const handleDrawZone = () => {
    enterDrawingMode();
    setActiveDrawTool('polygon');
    close();
  };

  const handleDropPin = () => {
    enterDrawingMode();
    setActiveDrawTool('point');
    close();
  };

  const handleAddPlant = () => {
    onAddPlant();
    close();
  };

  const actions: FABMenuItem[] = [
    { icon: <Leaf className="h-4 w-4" />, label: 'Add Plant', onClick: handleAddPlant, color: 'bg-green-600' },
    { icon: <Square className="h-4 w-4" />, label: 'Draw Zone', onClick: handleDrawZone, color: 'bg-emerald-600' },
    { icon: <MapPin className="h-4 w-4" />, label: 'Drop Pin', onClick: handleDropPin, color: 'bg-teal-600' },
    { icon: <Waves className="h-4 w-4" />, label: 'Water System', onClick: () => { onWaterSystem(); close(); }, color: 'bg-blue-600' },
    { icon: <Sparkles className="h-4 w-4" />, label: 'Build Guild', onClick: () => { onBuildGuild(); close(); }, color: 'bg-amber-600' },
    { icon: <Calendar className="h-4 w-4" />, label: 'Timeline', onClick: () => { onTimeline(); close(); }, color: 'bg-purple-600' },
  ];

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[45] transition-all duration-200",
        // Position: above bottom nav on mobile, lower-right on desktop
        "bottom-[88px] right-5 md:bottom-8 md:right-8"
      )}
    >
      {/* Speed dial items — fly up from the FAB */}
      {isOpen && (
        <>
          {/* Scrim / backdrop — dismiss on tap */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] -z-10 animate-in fade-in duration-150"
            onClick={close}
            aria-hidden
          />

          {/* Action items */}
          <div className="absolute bottom-16 right-0 flex flex-col gap-2.5 pb-2 items-end">
            {actions.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="group flex items-center gap-2.5 transition-all duration-200 ease-out"
                style={{
                  animation: `fabItemIn 200ms ${index * 35}ms ease-out both`,
                }}
              >
                {/* Label pill */}
                <span className="bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-1.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap border border-border/30">
                  {item.label}
                </span>
                {/* Icon circle */}
                <div className={cn(
                  "h-11 w-11 rounded-full shadow-lg flex items-center justify-center flex-shrink-0",
                  "text-white transition-transform hover:scale-110 active:scale-95",
                  item.color
                )}>
                  {item.icon}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Primary FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-xl flex items-center justify-center",
          "transition-all duration-250 ease-out",
          "bg-green-600 text-white",
          "hover:shadow-2xl hover:bg-green-500",
          "active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-green-400/30",
          isOpen && "rotate-45 bg-green-700 shadow-lg"
        )}
        aria-label={isOpen ? "Close actions menu" : "Open actions menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
