'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateGrowthMilestones, type GrowthMilestone } from '@/lib/time-machine/growth-milestones';

interface Planting {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  planted_year: number;
  years_to_maturity: number;
  mature_height_ft: number;
}

interface TimelinePlaybackBarProps {
  plantings: Planting[];
  currentYear: number;
  onYearChange: (year: number) => void;
  onClose: () => void;
  minYear?: number;
  maxYear?: number;
  /** Top offset in pixels (default: 48 for thin header) */
  topOffset?: number;
}

const SPEED_OPTIONS = [1, 2, 4] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

/** Milestone type to short label */
const MILESTONE_LABELS: Record<GrowthMilestone['type'], string> = {
  planted: 'Planted',
  established: 'Est.',
  flowering: 'Bloom',
  fruiting: 'Fruit',
  mature: 'Mature',
};

/** Milestone type to subtle color */
const MILESTONE_COLORS: Record<GrowthMilestone['type'], string> = {
  planted: 'bg-emerald-400',
  established: 'bg-emerald-500',
  flowering: 'bg-pink-400',
  fruiting: 'bg-amber-400',
  mature: 'bg-emerald-700',
};

export function TimelinePlaybackBar({
  plantings,
  currentYear,
  onYearChange,
  onClose,
  minYear: minYearProp,
  maxYear: maxYearProp,
  topOffset = 48,
}: TimelinePlaybackBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [showDetails, setShowDetails] = useState(false);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const thisYear = new Date().getFullYear();
  const minYear = minYearProp ?? thisYear;
  const maxYear = maxYearProp ?? thisYear + 20;
  const range = maxYear - minYear;
  const progress = range > 0 ? ((currentYear - minYear) / range) * 100 : 0;
  const isProjecting = currentYear !== thisYear;

  // Aggregate milestones
  const milestones = useMemo(() => {
    const all = plantings.flatMap((p) =>
      calculateGrowthMilestones({
        plantedYear: p.planted_year,
        yearsToMaturity: p.years_to_maturity,
        speciesName: p.common_name,
        layer: p.layer,
      })
    );
    // Group by year, keep the most significant milestone per year
    const byYear = new Map<number, GrowthMilestone>();
    const priority: GrowthMilestone['type'][] = ['mature', 'fruiting', 'flowering', 'established', 'planted'];
    for (const m of all) {
      if (m.year < minYear || m.year > maxYear) continue;
      const existing = byYear.get(m.year);
      if (!existing || priority.indexOf(m.type) < priority.indexOf(existing.type)) {
        byYear.set(m.year, m);
      }
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [plantings, minYear, maxYear]);

  // Growth summary for detail panel
  const growthSummary = useMemo(() => {
    return plantings.map((p) => {
      const age = currentYear - p.planted_year;
      const fraction = Math.min(Math.max(age / p.years_to_maturity, 0), 1);
      const sigmoid = 1 / (1 + Math.exp(-8 * (fraction - 0.5)));
      return {
        id: p.id,
        name: p.common_name,
        layer: p.layer,
        growth: Math.round(sigmoid * 100),
      };
    });
  }, [plantings, currentYear]);

  // Playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (currentYear >= maxYear) {
        setIsPlaying(false);
        return;
      }
      onYearChange(currentYear + 1);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [isPlaying, currentYear, maxYear, speed, onYearChange]);

  // Scrub handler
  const scrubToPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const year = Math.round(minYear + pct * range);
      onYearChange(year);
    },
    [minYear, range, onYearChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      scrubToPosition(e.clientX);
    },
    [scrubToPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current) {
        scrubToPosition(e.clientX);
      }
      // Hover year
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoveredYear(Math.round(minYear + pct * range));
      }
    },
    [scrubToPosition, minYear, range]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredYear(null);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onYearChange(Math.max(minYear, currentYear - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onYearChange(Math.min(maxYear, currentYear + 1));
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentYear, minYear, maxYear, onYearChange, onClose]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    onYearChange(thisYear);
  }, [thisYear, onYearChange]);

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  const matureCount = growthSummary.filter((p) => p.growth >= 95).length;
  const growingCount = growthSummary.filter((p) => p.growth > 0 && p.growth < 95).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 z-[39] bg-background/95 backdrop-blur-md border-b border-border/50"
      style={{ top: topOffset }}
    >
      {/* Main scrubber row */}
      <div className="px-3 sm:px-5 py-2 flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Year label */}
        <span className="text-sm font-semibold tabular-nums w-11 text-center flex-shrink-0">
          {currentYear}
        </span>

        {/* Track */}
        <div className="flex-1 relative">
          <div
            ref={trackRef}
            className="relative h-7 flex items-center cursor-pointer touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            {/* Background track */}
            <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />

            {/* Progress fill */}
            <motion.div
              className="absolute left-0 h-1 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />

            {/* Milestone dots */}
            {milestones.map((m, i) => {
              const pct = ((m.year - minYear) / range) * 100;
              const isPast = m.year <= currentYear;
              return (
                <div
                  key={i}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-150',
                    'w-2 h-2',
                    isPast ? MILESTONE_COLORS[m.type] : 'bg-muted-foreground/30',
                  )}
                  style={{ left: `${pct}%` }}
                  title={`${m.label} (${m.year})`}
                />
              );
            })}

            {/* Hover tooltip */}
            {hoveredYear !== null && !isDragging.current && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 bg-foreground text-background text-[10px] rounded tabular-nums pointer-events-none"
                style={{ left: `${((hoveredYear - minYear) / range) * 100}%` }}
              >
                {hoveredYear}
              </div>
            )}

            {/* Thumb */}
            <motion.div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-3.5 h-3.5 rounded-full',
                'bg-primary border-2 border-background',
                'shadow-sm cursor-grab active:cursor-grabbing',
                'transition-transform duration-100',
                isDragging.current && 'scale-125',
              )}
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Year endpoints */}
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground tabular-nums">{minYear}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{maxYear}</span>
          </div>
        </div>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground tabular-nums w-7 text-center flex-shrink-0 transition-colors"
          title="Cycle playback speed"
        >
          {speed}x
        </button>

        {/* Reset */}
        {isProjecting && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleReset}
            aria-label="Reset to current year"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Detail toggle */}
        {plantings.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={() => setShowDetails(!showDetails)}
            aria-label={showDetails ? 'Hide growth details' : 'Show growth details'}
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        )}

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={onClose}
          aria-label="Close time machine"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Summary badge */}
      {plantings.length > 0 && !showDetails && (
        <div className="px-5 pb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {growingCount > 0 && (
            <span>{growingCount} growing</span>
          )}
          {matureCount > 0 && (
            <span>{matureCount} mature</span>
          )}
          <span className="ml-auto text-[10px]">
            Arrow keys to step / Space to play
          </span>
        </div>
      )}

      {/* Expandable growth detail panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="px-5 py-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {growthSummary.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{p.layer}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${p.growth}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                        {p.growth}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
