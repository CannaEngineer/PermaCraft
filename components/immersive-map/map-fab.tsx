'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Leaf, Square, MapPin, Waves, Sparkles, Calendar, MessageSquare, Palette } from 'lucide-react';
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

interface SubMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

/**
 * Simplified MapFAB — 3 primary actions instead of 8.
 *
 * 1. Add (plant, zone, pin) — submenu on tap
 * 2. Design (water system, guild, timeline) — submenu on tap
 * 3. Chat (AI assistant) — direct action
 *
 * Journal and Farm Info moved to header menu (not map-drawing actions).
 */
export function MapFAB({ onAddPlant, onWaterSystem, onBuildGuild, onTimeline }: MapFABProps) {
  const { enterDrawingMode, setActiveDrawTool, setChatOpen, uiMode } = useImmersiveMapUI();
  const [activeMenu, setActiveMenu] = useState<'add' | 'design' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide FAB during drawing or chatting modes
  if (uiMode === 'drawing' || uiMode === 'chatting') return null;

  const handleDrawZone = () => {
    enterDrawingMode();
    setActiveDrawTool('polygon');
    setActiveMenu(null);
  };

  const handleDropPin = () => {
    enterDrawingMode();
    setActiveDrawTool('point');
    setActiveMenu(null);
  };

  const handleAddPlant = () => {
    onAddPlant();
    setActiveMenu(null);
  };

  const addItems: SubMenuItem[] = [
    { icon: <Leaf className="h-4 w-4" />, label: 'Add Plant', onClick: handleAddPlant, color: 'bg-green-600 text-white' },
    { icon: <Square className="h-4 w-4" />, label: 'Draw Zone', onClick: handleDrawZone, color: 'bg-emerald-600 text-white' },
    { icon: <MapPin className="h-4 w-4" />, label: 'Drop Pin', onClick: handleDropPin, color: 'bg-teal-600 text-white' },
  ];

  const designItems: SubMenuItem[] = [
    { icon: <Waves className="h-4 w-4" />, label: 'Water System', onClick: () => { onWaterSystem(); setActiveMenu(null); }, color: 'bg-blue-600 text-white' },
    { icon: <Sparkles className="h-4 w-4" />, label: 'Build Guild', onClick: () => { onBuildGuild(); setActiveMenu(null); }, color: 'bg-amber-600 text-white' },
    { icon: <Calendar className="h-4 w-4" />, label: 'Timeline', onClick: () => { onTimeline(); setActiveMenu(null); }, color: 'bg-purple-600 text-white' },
  ];

  const handleChatOpen = () => {
    setChatOpen(true);
    setActiveMenu(null);
  };

  const toggleMenu = (menu: 'add' | 'design') => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const activeItems = activeMenu === 'add' ? addItems : activeMenu === 'design' ? designItems : [];

  return (
    <div ref={menuRef} className="fixed bottom-[88px] right-6 z-[45] md:bottom-24 md:right-8">
      {/* Submenu items */}
      {activeMenu && (
        <div className="absolute bottom-[72px] right-0 flex flex-col gap-2 mb-3 items-end">
          {activeItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="group flex items-center justify-end gap-2.5 transition-all duration-200 ease-out animate-in slide-in-from-bottom-3"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span className="bg-card text-card-foreground px-2.5 py-1.5 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                {item.label}
              </span>
              <div className={cn(
                "h-10 w-10 rounded-full shadow-lg flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 active:scale-95",
                item.color
              )}>
                {item.icon}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 3 Primary action buttons — always visible in a vertical stack */}
      <div className="flex flex-col gap-3 items-center">
        {/* Chat button */}
        <button
          onClick={handleChatOpen}
          className={cn(
            "h-11 w-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            "bg-violet-600 text-white hover:scale-110 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          )}
          aria-label="AI Chat"
          title="AI Assistant"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Design button */}
        <button
          onClick={() => toggleMenu('design')}
          className={cn(
            "h-11 w-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            activeMenu === 'design'
              ? "bg-amber-500 text-white rotate-45"
              : "bg-amber-600 text-white hover:scale-110 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          )}
          aria-label="Design tools"
          title="Design (Water, Guild, Timeline)"
        >
          {activeMenu === 'design' ? <X className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
        </button>

        {/* Add button (primary) */}
        <button
          onClick={() => toggleMenu('add')}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
            "bg-green-600 text-white border-2 border-green-400/30",
            activeMenu === 'add' ? "rotate-45" : "hover:scale-110 active:scale-95",
            "focus:outline-none focus:ring-4 focus:ring-green-400/30"
          )}
          aria-label="Add to map"
          title="Add (Plant, Zone, Pin)"
        >
          {activeMenu === 'add' ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop */}
      {activeMenu && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
