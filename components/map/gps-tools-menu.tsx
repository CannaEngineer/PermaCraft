'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Crosshair, Footprints, TestTube2, Camera, X, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type GPSTool = 'drop-pin' | 'walk-boundary' | 'soil-test' | 'photo';

interface GPSToolsMenuProps {
  /** Which tool is currently active (null = none) */
  activeTool: GPSTool | null;
  /** Called when user selects a tool */
  onSelectTool: (tool: GPSTool) => void;
  /** Whether the menu should be visible */
  visible?: boolean;
}

const TOOLS: { id: GPSTool; label: string; icon: typeof Crosshair; color: string; ring: string }[] = [
  { id: 'drop-pin', label: "I'm Here", icon: Crosshair, color: 'bg-blue-600 hover:bg-blue-700', ring: 'focus:ring-blue-600/30' },
  { id: 'walk-boundary', label: 'Walk Boundary', icon: Footprints, color: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-600/30' },
  { id: 'soil-test', label: 'Soil Test', icon: TestTube2, color: 'bg-amber-700 hover:bg-amber-800', ring: 'focus:ring-amber-700/30' },
  { id: 'photo', label: 'Photo', icon: Camera, color: 'bg-pink-600 hover:bg-pink-700', ring: 'focus:ring-pink-600/30' },
];

/**
 * GPSToolsMenu — Expandable FAB menu for GPS field tools.
 *
 * Shows a single "GPS Tools" button that fans out to reveal:
 * - Drop Pin (I'm Here) — mark current location
 * - Walk Boundary — walk a zone perimeter
 * - Soil Test — log soil test at GPS location
 * - Photo — take geotagged photo
 */
export function GPSToolsMenu({ activeTool, onSelectTool, visible = true }: GPSToolsMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [expanded]);

  // Close menu when a tool becomes active
  useEffect(() => {
    if (activeTool) setExpanded(false);
  }, [activeTool]);

  const handleSelect = useCallback((tool: GPSTool) => {
    setExpanded(false);
    onSelectTool(tool);
  }, [onSelectTool]);

  if (!visible) return null;

  // If a tool is already active, don't show the menu — the active tool's UI takes over
  if (activeTool) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[45] bottom-[88px] left-5 md:bottom-8 md:left-8 flex flex-col-reverse items-start gap-2"
    >
      {/* Main toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 rounded-full shadow-xl transition-all duration-200',
          'bg-green-700 text-white hover:bg-green-800 active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-green-700/30',
          'h-14 px-4',
        )}
        aria-label={expanded ? 'Close GPS tools' : 'Open GPS tools'}
        aria-expanded={expanded}
      >
        {expanded ? (
          <X className="h-5 w-5" />
        ) : (
          <Crosshair className="h-5 w-5" />
        )}
        <span className="text-sm font-semibold pr-1">
          {expanded ? 'Close' : 'GPS Tools'}
        </span>
      </button>

      {/* Expanded tool buttons — fan upward */}
      {expanded && (
        <div className="flex flex-col-reverse gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => handleSelect(tool.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full shadow-lg transition-all duration-150',
                  'text-white active:scale-95',
                  'focus:outline-none focus:ring-4',
                  tool.color,
                  tool.ring,
                  'h-12 px-4',
                )}
                aria-label={tool.label}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium pr-1">{tool.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
