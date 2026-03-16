"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronDown } from 'lucide-react';
import {
  ZONE_TYPES,
  ZONE_TYPE_CATEGORIES,
  getZoneTypeConfig,
} from '@/lib/map/zone-types';

interface ZoneQuickLabelFormProps {
  position: { x: number; y: number }; // Screen coordinates where user finished drawing
  zoneId: string;
  /** Pre-selected zone type from the drawing toolbar */
  preselectedType?: string;
  onSave: (type: string, name?: string) => void;
  onSkip: () => void;
}

export function ZoneQuickLabelForm({
  position,
  zoneId,
  preselectedType,
  onSave,
  onSkip,
}: ZoneQuickLabelFormProps) {
  const [zoneType, setZoneType] = useState<string>(preselectedType || 'other');
  const [zoneName, setZoneName] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss after 15 seconds if no interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSkip();
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  // Focus name input on mount (desktop)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, []);

  // Adjust position if near viewport edges
  useEffect(() => {
    if (!formRef.current) return;
    const rect = formRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > vw - 16) x = vw - rect.width - 16;
    if (x < 16) x = 16;
    if (y + rect.height > vh - 16) y = vh - rect.height - 16;
    if (y < 16) y = 16;

    setAdjustedPosition({ x, y });
  }, [position]);

  const handleSave = () => {
    onSave(zoneType, zoneName.trim() || undefined);
  };

  const handleSkip = () => {
    onSave(zoneType !== 'other' ? zoneType : 'other', undefined);
    onSkip();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPicker) return; // Don't interfere with picker navigation
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
  }, [zoneType, zoneName, showPicker]);

  const currentConfig = getZoneTypeConfig(zoneType);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const formStyle = isMobile
    ? { position: 'fixed' as const, bottom: '4.5rem', left: '0.75rem', right: '0.75rem', zIndex: 65 }
    : { position: 'fixed' as const, left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px`, zIndex: 65 };

  return (
    <>
      {/* Transparent backdrop */}
      <div className="fixed inset-0 z-[60]" onClick={handleSkip} />

      {/* Quick Label Form */}
      <div
        ref={formRef}
        style={formStyle}
        className="z-[65] bg-background/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] border border-border/50 w-[300px] max-md:w-auto animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-md"
              style={{ backgroundColor: currentConfig.fillColor }}
            />
            <h4 className="text-sm font-semibold">Label Zone</h4>
          </div>
          <button
            onClick={handleSkip}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="p-4 space-y-3">
          {/* Zone Type Button — opens inline picker */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Type
            </label>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div
                className="w-4 h-4 rounded-md border border-black/10 flex-shrink-0"
                style={{ backgroundColor: currentConfig.fillColor }}
              />
              <span className="text-sm font-medium flex-1 truncate">{currentConfig.label}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Inline zone picker */}
            {showPicker && (
              <div className="mt-2 max-h-[200px] overflow-y-auto rounded-xl border border-border/30 bg-muted/20 p-1">
                {Object.entries(ZONE_TYPE_CATEGORIES).filter(([cat]) => cat !== 'Other').map(([category, types]) => (
                  <div key={category}>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg"
                    >
                      <div className="flex -space-x-0.5">
                        {types.slice(0, 3).map(t => (
                          <div
                            key={t}
                            className="w-2.5 h-2.5 rounded-full border border-background"
                            style={{ backgroundColor: ZONE_TYPES[t]?.fillColor }}
                          />
                        ))}
                      </div>
                      <span className="flex-1 text-left">{category}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedCategory === category && (
                      <div className="pl-1 pb-1">
                        {types.map(t => {
                          const config = ZONE_TYPES[t];
                          if (!config) return null;
                          const isSelected = zoneType === t;
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                setZoneType(t);
                                setShowPicker(false);
                                setExpandedCategory(null);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                isSelected ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-md border border-black/10"
                                style={{ backgroundColor: config.fillColor }}
                              />
                              <span className="truncate">{config.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone Name */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Name <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder='e.g. "Front Pond"'
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50"
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
              variant="ghost"
              size="sm"
              className="flex-1 h-10 rounded-xl text-xs font-medium"
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              size="sm"
              className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Keyboard hint — desktop only */}
        <div className="hidden md:block px-4 py-2 border-t border-border/20 text-center">
          <p className="text-[10px] text-muted-foreground">
            <kbd className="px-1 py-0.5 bg-muted/50 border border-border/50 rounded text-[10px]">Enter</kbd> save
            {' · '}
            <kbd className="px-1 py-0.5 bg-muted/50 border border-border/50 rounded text-[10px]">Esc</kbd> skip
          </p>
        </div>
      </div>
    </>
  );
}
