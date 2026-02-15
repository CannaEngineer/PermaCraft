"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { USER_SELECTABLE_ZONE_TYPES, getZoneTypeConfig } from '@/lib/map/zone-types';

interface ZoneQuickLabelFormProps {
  position: { x: number; y: number }; // Screen coordinates where user finished drawing
  zoneId: string;
  onSave: (type: string, name?: string) => void;
  onSkip: () => void;
}

export function ZoneQuickLabelForm({
  position,
  zoneId,
  onSave,
  onSkip
}: ZoneQuickLabelFormProps) {
  const [zoneType, setZoneType] = useState<string>('other');
  const [zoneName, setZoneName] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Auto-dismiss after 10 seconds if no interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSkip();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Adjust position if near viewport edges
  useEffect(() => {
    if (!formRef.current) return;

    const rect = formRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Check if form would go off right edge
    if (adjustedX + rect.width > viewportWidth - 20) {
      adjustedX = viewportWidth - rect.width - 20;
    }

    // Check if form would go off left edge
    if (adjustedX < 20) {
      adjustedX = 20;
    }

    // Check if form would go off bottom edge
    if (adjustedY + rect.height > viewportHeight - 20) {
      adjustedY = viewportHeight - rect.height - 20;
    }

    // Check if form would go off top edge
    if (adjustedY < 20) {
      adjustedY = 20;
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [position]);

  const handleSave = () => {
    onSave(zoneType, zoneName.trim() || undefined);
  };

  const handleSkip = () => {
    // Skip saves with default "other" type
    onSave('other', undefined);
    onSkip();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoneType, zoneName]);

  // Common zone type options organized by category
  const zoneTypeOptions = [
    { value: 'other', label: '— Select Type —', category: '' },
    { value: 'zone_0', label: 'Zone 0 (Home)', category: 'Permaculture Zones' },
    { value: 'zone_1', label: 'Zone 1 (Kitchen Garden)', category: 'Permaculture Zones' },
    { value: 'zone_2', label: 'Zone 2 (Orchard)', category: 'Permaculture Zones' },
    { value: 'zone_3', label: 'Zone 3 (Main Crops)', category: 'Permaculture Zones' },
    { value: 'zone_4', label: 'Zone 4 (Forage)', category: 'Permaculture Zones' },
    { value: 'zone_5', label: 'Zone 5 (Wild)', category: 'Permaculture Zones' },
    { value: 'annual_garden', label: 'Annual Garden', category: 'Growing Areas' },
    { value: 'orchard', label: 'Orchard', category: 'Growing Areas' },
    { value: 'food_forest', label: 'Food Forest', category: 'Growing Areas' },
    { value: 'pasture', label: 'Pasture', category: 'Growing Areas' },
    { value: 'woodland', label: 'Woodland', category: 'Growing Areas' },
    { value: 'pond', label: 'Pond', category: 'Water Features' },
    { value: 'swale', label: 'Swale', category: 'Water Features' },
    { value: 'water_body', label: 'Water Body', category: 'Water Features' },
    { value: 'water_flow', label: 'Water Flow', category: 'Water Features' },
    { value: 'structure', label: 'Structure', category: 'Infrastructure' },
    { value: 'path', label: 'Path', category: 'Infrastructure' },
    { value: 'fence', label: 'Fence', category: 'Infrastructure' },
  ];

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // On mobile, anchor to bottom instead
  const formStyle = isMobile
    ? {
        position: 'fixed' as const,
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        zIndex: 1000
      }
    : {
        position: 'fixed' as const,
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 1000
      };

  return (
    <>
      {/* Transparent backdrop to catch clicks */}
      <div
        className="fixed inset-0 z-[999]"
        onClick={handleSkip}
      />

      {/* Quick Label Form */}
      <div
        ref={formRef}
        style={formStyle}
        className="z-[1000] bg-card rounded-lg shadow-2xl border-2 border-green-500 w-[280px] max-md:w-auto animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
            Quick Label Zone
          </h4>
          <Button
            type="button"
            onClick={handleSkip}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Form Fields */}
        <div className="p-3 space-y-3">
          {/* Zone Type Dropdown */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Zone Type
            </label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
              autoFocus
            >
              {zoneTypeOptions.map((option, index) => {
                // Show category headers
                if (index > 0 && option.category !== zoneTypeOptions[index - 1].category) {
                  return (
                    <optgroup key={option.category} label={option.category}>
                      <option value={option.value}>{option.label}</option>
                    </optgroup>
                  );
                } else if (index === 0 || option.category === zoneTypeOptions[index - 1].category) {
                  return (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  );
                }
                return null;
              })}
            </select>
          </div>

          {/* Zone Name (Optional) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name (optional)
            </label>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder='e.g., "Front Pond"'
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={handleSkip}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="px-3 py-2 bg-muted/30 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Enter</kbd> to save
            {' • '}
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </>
  );
}
