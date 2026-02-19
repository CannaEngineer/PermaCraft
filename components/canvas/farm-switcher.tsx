'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Plus } from 'lucide-react';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function FarmSwitcher() {
  const { farms, activeFarmId, activeFarm, setActiveFarmId } = useUnifiedCanvas();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (farms.length === 0) {
    return (
      <button
        onClick={() => router.push('/farm/new')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create Farm</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors max-w-[200px]',
          open ? 'bg-accent' : 'hover:bg-accent/50'
        )}
      >
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="truncate font-medium">
          {activeFarm?.name || 'Select Farm'}
        </span>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl glass-panel-strong shadow-lg border border-border/40 overflow-hidden z-50">
          <div className="py-1 max-h-[300px] overflow-y-auto">
            {farms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => {
                  setActiveFarmId(farm.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors',
                  farm.id === activeFarmId && 'bg-accent'
                )}
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{farm.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {farm.acres ? `${farm.acres} acres` : 'No size set'}
                    {farm.climate_zone ? ` \u00b7 Zone ${farm.climate_zone}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-border/40 p-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/farm/new');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Farm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
