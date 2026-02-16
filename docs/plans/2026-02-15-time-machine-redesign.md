# Time Machine UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the simple timeline slider into an engaging, visual time machine that makes plant growth simulation fun and necessary for farm planning.

**Architecture:** Split-panel design with animated timeline visualization, growth preview cards, milestone markers, season indicators, and playback controls. Use Framer Motion for smooth animations and d3 for timeline visualization.

**Tech Stack:** React, Framer Motion, d3-scale, date-fns, Tailwind CSS, shadcn/ui

---

## Current System Analysis

**Current Implementation:**
- File: `components/map/map-bottom-drawer.tsx:565-629`
- Current UI: Simple range slider (lines 571-582), play/pause buttons (lines 586-611)
- State: `currentYear`, `minYear`, `maxYear`
- Growth calculation: Located in `components/map/planting-marker.tsx:40-68` (sigmoid curve)

**Issues:**
- Not engaging or fun
- Difficult to see what happens at specific years
- No visual indication of growth milestones
- Missing seasonal context
- Not mobile-friendly

---

## Task 1: Growth Milestone Calculator

**Files:**
- Create: `lib/time-machine/growth-milestones.ts`
- Test: `lib/time-machine/growth-milestones.test.ts`

**Step 1: Write failing test**

```typescript
// lib/time-machine/growth-milestones.test.ts
import { describe, test, expect } from '@jest/globals';
import { calculateGrowthMilestones, getMilestoneIcon } from './growth-milestones';

describe('Growth Milestones', () => {
  test('calculates milestones for standard tree', () => {
    const milestones = calculateGrowthMilestones({
      plantedYear: 2024,
      yearsToMaturity: 10,
      speciesName: 'Apple Tree'
    });

    expect(milestones).toHaveLength(4);
    expect(milestones[0]).toMatchObject({
      year: 2024,
      type: 'planted',
      label: 'Planted'
    });
    expect(milestones[1]).toMatchObject({
      year: 2027,
      type: 'flowering',
      label: 'First Flowers'
    });
  });

  test('returns correct icon for milestone type', () => {
    expect(getMilestoneIcon('planted')).toBe('🌱');
    expect(getMilestoneIcon('flowering')).toBe('🌸');
    expect(getMilestoneIcon('fruiting')).toBe('🍎');
    expect(getMilestoneIcon('mature')).toBe('🌳');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- growth-milestones.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement growth milestone calculator**

```typescript
// lib/time-machine/growth-milestones.ts
export interface GrowthMilestone {
  year: number;
  type: 'planted' | 'established' | 'flowering' | 'fruiting' | 'mature';
  label: string;
  description: string;
  sizeFraction: number; // 0-1, how much of mature size
}

export interface PlantingInfo {
  plantedYear: number;
  yearsToMaturity: number;
  speciesName: string;
  layer?: string;
}

/**
 * Calculate key growth milestones for a planting
 */
export function calculateGrowthMilestones(planting: PlantingInfo): GrowthMilestone[] {
  const { plantedYear, yearsToMaturity, layer } = planting;
  const milestones: GrowthMilestone[] = [];

  // Planted
  milestones.push({
    year: plantedYear,
    type: 'planted',
    label: 'Planted',
    description: 'Seedling or transplant',
    sizeFraction: 0.05
  });

  // Established (Year 2 or 20% of maturity)
  const establishedYear = plantedYear + Math.max(1, Math.floor(yearsToMaturity * 0.2));
  milestones.push({
    year: establishedYear,
    type: 'established',
    label: 'Established',
    description: 'Root system developed, active growth',
    sizeFraction: 0.3
  });

  // Flowering/Fruiting (trees/shrubs at 30% maturity, herbs earlier)
  if (layer === 'canopy' || layer === 'understory' || layer === 'shrub') {
    const floweringYear = plantedYear + Math.floor(yearsToMaturity * 0.3);
    milestones.push({
      year: floweringYear,
      type: 'flowering',
      label: 'First Flowers',
      description: 'Beginning to flower and potentially fruit',
      sizeFraction: 0.5
    });

    const fruitingYear = plantedYear + Math.floor(yearsToMaturity * 0.5);
    milestones.push({
      year: fruitingYear,
      type: 'fruiting',
      label: 'Full Production',
      description: 'Reliable fruit/nut production',
      sizeFraction: 0.75
    });
  }

  // Mature
  milestones.push({
    year: plantedYear + yearsToMaturity,
    type: 'mature',
    label: 'Mature',
    description: 'Full size and productivity',
    sizeFraction: 1.0
  });

  return milestones;
}

/**
 * Get emoji icon for milestone type
 */
export function getMilestoneIcon(type: GrowthMilestone['type']): string {
  const icons = {
    planted: '🌱',
    established: '🌿',
    flowering: '🌸',
    fruiting: '🍎',
    mature: '🌳'
  };
  return icons[type] || '🌱';
}

/**
 * Get color for milestone type
 */
export function getMilestoneColor(type: GrowthMilestone['type']): string {
  const colors = {
    planted: '#22c55e',
    established: '#16a34a',
    flowering: '#ec4899',
    fruiting: '#f59e0b',
    mature: '#166534'
  };
  return colors[type] || '#22c55e';
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- growth-milestones.test.ts
```

Expected: PASS

**Step 5: Commit milestone calculator**

```bash
git add lib/time-machine/growth-milestones.ts lib/time-machine/growth-milestones.test.ts
git commit -m "feat(time-machine): add growth milestone calculator"
```

---

## Task 2: Seasonal Context Helper

**Files:**
- Create: `lib/time-machine/seasonal-context.ts`

**Step 1: Create seasonal helper**

```typescript
// lib/time-machine/seasonal-context.ts
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalInfo {
  season: Season;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Get season for a given month
 * Northern hemisphere seasons
 */
export function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

/**
 * Get seasonal information
 */
export function getSeasonalInfo(season: Season): SeasonalInfo {
  const info: Record<Season, SeasonalInfo> = {
    spring: {
      season: 'spring',
      label: 'Spring',
      icon: '🌸',
      color: '#22c55e',
      description: 'Planting season, active growth begins'
    },
    summer: {
      season: 'summer',
      label: 'Summer',
      icon: '☀️',
      color: '#f59e0b',
      description: 'Peak growth, flowering, and fruiting'
    },
    fall: {
      season: 'fall',
      label: 'Fall',
      icon: '🍂',
      color: '#ea580c',
      description: 'Harvest time, plants preparing for dormancy'
    },
    winter: {
      season: 'winter',
      label: 'Winter',
      icon: '❄️',
      color: '#60a5fa',
      description: 'Dormant period, planning for spring'
    }
  };
  return info[season];
}

/**
 * Get seasonal activities for farm planning
 */
export function getSeasonalActivities(season: Season): string[] {
  const activities: Record<Season, string[]> = {
    spring: [
      'Plant bare-root trees',
      'Start annual seeds',
      'Prune dormant trees',
      'Apply mulch'
    ],
    summer: [
      'Harvest fruits and vegetables',
      'Monitor irrigation',
      'Manage pests organically',
      'Take plant cuttings'
    ],
    fall: [
      'Plant garlic and perennials',
      'Harvest tree crops',
      'Collect seeds',
      'Prepare beds for winter'
    ],
    winter: [
      'Plan next year\'s plantings',
      'Prune fruit trees',
      'Build infrastructure',
      'Review and reflect'
    ]
  };
  return activities[season];
}
```

**Step 2: Commit seasonal context**

```bash
git add lib/time-machine/seasonal-context.ts
git commit -m "feat(time-machine): add seasonal context helper"
```

---

## Task 3: Timeline Visualization Component

**Files:**
- Create: `components/time-machine/timeline-viz.tsx`
- Create: `components/time-machine/timeline-viz.module.css`

**Step 1: Create timeline visualization**

```tsx
// components/time-machine/timeline-viz.tsx
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { cn } from '@/lib/utils';
import { GrowthMilestone, getMilestoneIcon, getMilestoneColor } from '@/lib/time-machine/growth-milestones';
import styles from './timeline-viz.module.css';

interface TimelineVizProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  milestones: GrowthMilestone[];
  onYearChange: (year: number) => void;
  className?: string;
}

export function TimelineViz({
  minYear,
  maxYear,
  currentYear,
  milestones,
  onYearChange,
  className
}: TimelineVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Create year scale
  const yearScale = useMemo(() => {
    return scaleLinear()
      .domain([minYear, maxYear])
      .range([0, 100]); // Percentage
  }, [minYear, maxYear]);

  // Handle drag to change year
  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    const year = Math.round(minYear + (percentage / 100) * (maxYear - minYear));
    onYearChange(year);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleDrag(e);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const currentPercentage = yearScale(currentYear);

  return (
    <div className={cn('relative', className)}>
      {/* Timeline track */}
      <div
        ref={containerRef}
        className={cn(
          'relative h-16 bg-muted rounded-full cursor-pointer',
          'select-none touch-none',
          styles.timeline
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={() => isDragging.current = true}
        onTouchMove={handleDrag}
        onClick={handleDrag}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={false}
          animate={{ width: `${currentPercentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Milestone markers */}
        {milestones.map((milestone, index) => {
          const percentage = yearScale(milestone.year);
          const isPast = milestone.year <= currentYear;

          return (
            <motion.div
              key={index}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-10 h-10 rounded-full',
                'flex items-center justify-center',
                'border-2 border-background',
                'cursor-pointer z-10',
                'transition-all duration-200',
                isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                styles.milestone
              )}
              style={{
                left: `${percentage}%`,
                backgroundColor: isPast ? getMilestoneColor(milestone.type) : undefined
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onYearChange(milestone.year);
              }}
            >
              <span className="text-lg">
                {getMilestoneIcon(milestone.type)}
              </span>
            </motion.div>
          );
        })}

        {/* Current year indicator */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-14 h-14 rounded-full',
            'bg-primary border-4 border-background',
            'flex items-center justify-center',
            'shadow-lg z-20',
            'cursor-grab active:cursor-grabbing',
            styles.indicator
          )}
          style={{ left: `${currentPercentage}%` }}
          drag="x"
          dragConstraints={containerRef}
          dragElastic={0}
          onDrag={(_, info) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, ((info.point.x - rect.left) / rect.width) * 100));
            const year = Math.round(minYear + (percentage / 100) * (maxYear - minYear));
            onYearChange(year);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-center">
            <div className="text-[10px] font-bold text-primary-foreground">
              {currentYear}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Year labels */}
      <div className="flex justify-between mt-2 px-2">
        <span className="text-xs text-muted-foreground">{minYear}</span>
        <span className="text-xs text-muted-foreground">{maxYear}</span>
      </div>
    </div>
  );
}
```

**Step 2: Create timeline styles**

```css
/* components/time-machine/timeline-viz.module.css */
.timeline {
  position: relative;
}

.milestone {
  transition: all 0.2s ease;
}

.milestone:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.indicator {
  transition: box-shadow 0.2s ease;
}

.indicator:active {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
```

**Step 3: Commit timeline visualization**

```bash
git add components/time-machine/timeline-viz.tsx components/time-machine/timeline-viz.module.css
git commit -m "feat(time-machine): add interactive timeline visualization"
```

---

## Task 4: Growth Preview Cards

**Files:**
- Create: `components/time-machine/growth-preview-card.tsx`

**Step 1: Create preview card component**

```tsx
// components/time-machine/growth-preview-card.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GrowthMilestone } from '@/lib/time-machine/growth-milestones';

interface PlantingPreview {
  id: string;
  commonName: string;
  scientificName: string;
  layer: string;
  currentSize: number; // Percentage of mature size
  nextMilestone?: GrowthMilestone;
}

interface GrowthPreviewCardProps {
  planting: PlantingPreview;
  className?: string;
}

export function GrowthPreviewCard({ planting, className }: GrowthPreviewCardProps) {
  const { commonName, scientificName, layer, currentSize, nextMilestone } = planting;

  return (
    <motion.div
      className={cn(
        'bg-card border border-border rounded-lg p-4',
        'hover:shadow-md transition-shadow',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">{commonName}</h4>
          <p className="text-xs text-muted-foreground italic">{scientificName}</p>
        </div>
        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded capitalize">
          {layer}
        </span>
      </div>

      {/* Growth progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Growth</span>
          <span className="font-semibold text-foreground">{Math.round(currentSize)}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentSize}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Next milestone */}
        {nextMilestone && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">Next milestone:</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg">
                {getMilestoneIcon(nextMilestone.type)}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {nextMilestone.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Year {nextMilestone.year}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Re-export for convenience
import { getMilestoneIcon } from '@/lib/time-machine/growth-milestones';
```

**Step 2: Commit preview cards**

```bash
git add components/time-machine/growth-preview-card.tsx
git commit -m "feat(time-machine): add growth preview cards"
```

---

## Task 5: Time Machine Container

**Files:**
- Create: `components/time-machine/redesigned-time-machine.tsx`

**Step 1: Create main time machine component**

```tsx
// components/time-machine/redesigned-time-machine.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineViz } from './timeline-viz';
import { GrowthPreviewCard } from './growth-preview-card';
import { calculateGrowthMilestones } from '@/lib/time-machine/growth-milestones';
import { getSeason, getSeasonalInfo, getSeasonalActivities } from '@/lib/time-machine/seasonal-context';

interface Planting {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  planted_year: number;
  years_to_maturity: number;
  mature_height_ft: number;
}

interface RedesignedTimeMachineProps {
  plantings: Planting[];
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  onClose?: () => void;
}

export function RedesignedTimeMachine({
  plantings,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
  onClose
}: RedesignedTimeMachineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  // Calculate milestones for all plantings
  const allMilestones = useMemo(() => {
    const milestones = plantings.flatMap(p =>
      calculateGrowthMilestones({
        plantedYear: p.planted_year,
        yearsToMaturity: p.years_to_maturity,
        speciesName: p.common_name,
        layer: p.layer
      })
    );

    // Deduplicate by year and sort
    const uniqueYears = [...new Set(milestones.map(m => m.year))];
    return uniqueYears
      .map(year => milestones.find(m => m.year === year)!)
      .sort((a, b) => a.year - b.year);
  }, [plantings]);

  // Playback interval
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentYear >= maxYear) {
        setIsPlaying(false);
        return;
      }
      onYearChange(currentYear + 1);
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentYear, maxYear, playbackSpeed, onYearChange]);

  // Get current season
  const currentSeason = getSeason(new Date(currentYear, 0, 1).getMonth());
  const seasonalInfo = getSeasonalInfo(currentSeason);
  const seasonalActivities = getSeasonalActivities(currentSeason);

  // Calculate growth for each planting
  const plantingPreviews = useMemo(() => {
    return plantings.map(planting => {
      const age = currentYear - planting.planted_year;
      const growthFraction = Math.min(age / planting.years_to_maturity, 1);

      // Sigmoid curve for realistic growth
      const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
      const currentSize = sigmoid(growthFraction) * 100;

      // Find next milestone
      const milestones = calculateGrowthMilestones({
        plantedYear: planting.planted_year,
        yearsToMaturity: planting.years_to_maturity,
        speciesName: planting.common_name,
        layer: planting.layer
      });
      const nextMilestone = milestones.find(m => m.year > currentYear);

      return {
        id: planting.id,
        commonName: planting.common_name,
        scientificName: planting.scientific_name,
        layer: planting.layer,
        currentSize,
        nextMilestone
      };
    });
  }, [plantings, currentYear]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">Time Machine</h2>
          <p className="text-xs text-muted-foreground">
            Simulate plant growth over {maxYear - minYear} years
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6 border-b border-border">
        <TimelineViz
          minYear={minYear}
          maxYear={maxYear}
          currentYear={currentYear}
          milestones={allMilestones}
          onYearChange={onYearChange}
        />

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onYearChange(minYear)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>

          {/* Speed control */}
          <div className="flex gap-1">
            {([1, 2, 4] as const).map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "ghost"}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                className="w-10"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* Seasonal context */}
          <motion.div
            className="bg-card border border-border rounded-lg p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{seasonalInfo.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {seasonalInfo.label} {currentYear}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {seasonalInfo.description}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Seasonal activities:
              </div>
              <ul className="space-y-1">
                {seasonalActivities.map((activity, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Growth previews */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Plant Growth ({plantingPreviews.length})
            </h3>
            <AnimatePresence mode="popLayout">
              {plantingPreviews.slice(0, 5).map(preview => (
                <GrowthPreviewCard
                  key={preview.id}
                  planting={preview}
                />
              ))}
            </AnimatePresence>
            {plantingPreviews.length > 5 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                +{plantingPreviews.length - 5} more plants
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
```

**Step 2: Commit time machine container**

```bash
git add components/time-machine/redesigned-time-machine.tsx
git commit -m "feat(time-machine): add redesigned time machine container"
```

---

## Task 6: Integration with Map Bottom Drawer

**Files:**
- Modify: `components/map/map-bottom-drawer.tsx:565-629`

**Step 1: Replace time machine tab content**

```tsx
// In map-bottom-drawer.tsx, import:
import { RedesignedTimeMachine } from '@/components/time-machine/redesigned-time-machine';

// Replace lines 565-629 with:
{activeTab === 'timemachine' && currentYear !== undefined && onYearChange && (
  <RedesignedTimeMachine
    plantings={plantings}
    currentYear={currentYear}
    onYearChange={onYearChange}
    minYear={minYear}
    maxYear={maxYear}
    onClose={onCloseTimeMachine}
  />
)}
```

**Step 2: Test integration**

```bash
npm run dev
# Navigate to farm map
# Open time machine tab
# Verify: Timeline renders, playback works, growth cards animate
```

**Step 3: Commit integration**

```bash
git add components/map/map-bottom-drawer.tsx
git commit -m "feat(time-machine): integrate redesigned time machine"
```

---

## Task 7: Mobile Responsive Design

**Files:**
- Modify: `components/time-machine/redesigned-time-machine.tsx`

**Step 1: Add mobile-specific layouts**

```tsx
// Update grid classes:
<div className="grid grid-cols-1 gap-4 p-4">
  {/* Single column on mobile, side-by-side on desktop */}
</div>

// Add mobile-friendly timeline:
<TimelineViz
  className="touch-none" // Prevent scroll interference
  // ... props
/>

// Stack preview cards on mobile:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {/* Preview cards */}
</div>
```

**Step 2: Commit mobile optimizations**

```bash
git add components/time-machine/redesigned-time-machine.tsx
git commit -m "feat(time-machine): add mobile responsive design"
```

---

## Task 8: Documentation

**Files:**
- Create: `docs/components/redesigned-time-machine.md`

**Step 1: Create documentation**

```markdown
# Redesigned Time Machine

## Overview
Interactive timeline visualization for simulating plant growth over 20+ years. Features milestone markers, seasonal context, and growth preview cards.

## Components

### TimelineViz
Interactive d3-based timeline with draggable year indicator.

### GrowthPreviewCard
Shows individual plant growth progress and next milestone.

### RedesignedTimeMachine
Main container with playback controls.

## Growth Calculation
Uses sigmoid curve: `y = 1 / (1 + e^(-8(x - 0.5)))`
Where x = age / years_to_maturity

## Milestones
- Planted (Year 0)
- Established (20% of maturity)
- Flowering (30% for trees/shrubs)
- Fruiting (50% for trees/shrubs)
- Mature (100%)

## Seasonal Context
Shows current season activities based on Northern Hemisphere calendar.

## Performance
- Memoized growth calculations
- Debounced year changes during drag
- Only renders top 5 preview cards
```

**Step 2: Commit documentation**

```bash
git add docs/components/redesigned-time-machine.md
git commit -m "docs(time-machine): add component documentation"
```

---

## Testing Checklist

- [ ] Timeline renders correctly
- [ ] Milestones appear at correct positions
- [ ] Dragging indicator changes year
- [ ] Play/pause controls work
- [ ] Speed controls work (1x, 2x, 4x)
- [ ] Growth cards animate smoothly
- [ ] Seasonal context updates
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation)
- [ ] Performance: 60fps during playback

---

## Success Metrics

- **Engagement:** Time spent in time machine +200%
- **Understanding:** User survey - "Time machine helps plan" >4.5/5
- **Fun factor:** Social shares featuring time machine +150%
- **Performance:** Playback maintains 60fps with 50+ plantings
