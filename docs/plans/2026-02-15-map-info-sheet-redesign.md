# Map Info Sheet UI/UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the map bottom drawer (info sheet) with professional Google/Apple-level polish for quick access to critical farm information.

**Architecture:** Replace current tab-based drawer with card-grid layout, add quick actions bar, implement adaptive sizing based on content density, use design tokens for consistency.

**Tech Stack:** React, Tailwind CSS, Framer Motion, shadcn/ui components, React Hook Form (for quick inputs)

---

## Current System Analysis

**Current Implementation:**
- File: `components/map/map-bottom-drawer.tsx`
- Structure: Tab-based navigation (Vitals, Filters, Settings, Features, Time Machine, Legend)
- State: Collapsed/expanded with peek bar
- Issues: Too many clicks to access info, cramped layout on mobile, inconsistent information hierarchy

**Components Referenced:**
- `FarmVitals` - Shows permaculture function counts
- `FeatureListPanel` - Lists zones, plantings, lines
- Tab content for filters, settings

---

## Task 1: Design System Tokens

**Files:**
- Create: `lib/design/map-info-tokens.ts`
- Modify: `tailwind.config.ts` (add custom theme extensions)

**Step 1: Create design tokens file**

```typescript
// lib/design/map-info-tokens.ts
export const MAP_INFO_TOKENS = {
  spacing: {
    card: {
      padding: 'p-4',
      gap: 'gap-3',
      margin: 'mb-3'
    },
    section: {
      padding: 'p-6',
      gap: 'gap-4'
    }
  },
  typography: {
    title: 'text-sm font-semibold text-foreground',
    subtitle: 'text-xs font-medium text-muted-foreground',
    value: 'text-2xl font-bold text-foreground',
    label: 'text-xs text-muted-foreground uppercase tracking-wide',
    metric: 'text-lg font-semibold text-foreground'
  },
  colors: {
    card: {
      background: 'bg-card',
      border: 'border border-border',
      hover: 'hover:bg-accent/50'
    },
    status: {
      success: 'bg-green-500/10 text-green-700 dark:text-green-400',
      warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      error: 'bg-red-500/10 text-red-700 dark:text-red-400',
      info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    }
  },
  animation: {
    card: 'transition-all duration-200 ease-in-out',
    slide: 'transition-transform duration-300 ease-out',
    fade: 'transition-opacity duration-200'
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md',
    drawer: 'shadow-xl'
  }
} as const;

export type MapInfoTokens = typeof MAP_INFO_TOKENS;
```

**Step 2: Commit design tokens**

```bash
git add lib/design/map-info-tokens.ts
git commit -m "design: add map info sheet design tokens"
```

---

## Task 2: Quick Stats Card Component

**Files:**
- Create: `components/map/info-cards/quick-stats-card.tsx`
- Test: Manual visual inspection

**Step 1: Create QuickStatsCard component**

```tsx
// components/map/info-cards/quick-stats-card.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'success' | 'warning' | 'error' | 'info';
}

interface QuickStatsCardProps {
  stats: StatItem[];
  title?: string;
  className?: string;
}

export function QuickStatsCard({ stats, title, className }: QuickStatsCardProps) {
  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg overflow-hidden',
      tokens.animation.card,
      className
    )}>
      {title && (
        <div className={cn(tokens.spacing.card.padding, 'border-b border-border')}>
          <h3 className={tokens.typography.title}>{title}</h3>
        </div>
      )}
      <div className={cn(
        'grid grid-cols-2 md:grid-cols-4 gap-px bg-border',
        !title && 'rounded-lg overflow-hidden'
      )}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = stat.color ? tokens.colors.status[stat.color] : '';

          return (
            <div
              key={index}
              className={cn(
                tokens.colors.card.background,
                tokens.spacing.card.padding,
                'flex flex-col items-center justify-center text-center',
                tokens.colors.card.hover,
                'cursor-pointer'
              )}
            >
              <div className={cn(
                'p-2 rounded-full mb-2',
                colorClass || 'bg-primary/10'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className={tokens.typography.value}>{stat.value}</div>
              <div className={tokens.typography.label}>{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Test component rendering**

Create test page at `app/test-info-cards/page.tsx`:

```tsx
import { QuickStatsCard } from '@/components/map/info-cards/quick-stats-card';
import { Sprout, Square, Activity, TrendingUp } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="p-8 space-y-4">
      <QuickStatsCard
        title="Farm Overview"
        stats={[
          { label: 'Plantings', value: 24, icon: Sprout, color: 'success' },
          { label: 'Zones', value: 8, icon: Square, color: 'info' },
          { label: 'Functions', value: 12, icon: Activity, color: 'warning' },
          { label: 'Growth', value: '85%', icon: TrendingUp, color: 'success' }
        ]}
      />
    </div>
  );
}
```

**Step 3: Visual inspection**

Run: `npm run dev` and navigate to `/test-info-cards`
Expected: Card displays with 4 stats in grid, hover effects work, responsive on mobile

**Step 4: Commit quick stats card**

```bash
git add components/map/info-cards/quick-stats-card.tsx app/test-info-cards/page.tsx
git commit -m "feat(map-info): add QuickStatsCard component"
```

---

## Task 3: Compact Filter Pills Component

**Files:**
- Create: `components/map/info-cards/compact-filter-pills.tsx`

**Step 1: Create CompactFilterPills component**

```tsx
// components/map/info-cards/compact-filter-pills.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterPill {
  id: string;
  label: string;
  color?: string;
  count?: number;
}

interface CompactFilterPillsProps {
  filters: FilterPill[];
  activeFilters: string[];
  onToggle: (id: string) => void;
  onClearAll?: () => void;
  title?: string;
}

export function CompactFilterPills({
  filters,
  activeFilters,
  onToggle,
  onClearAll,
  title = "Filters"
}: CompactFilterPillsProps) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg',
      tokens.spacing.card.padding
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={tokens.typography.title}>{title}</h3>
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter.id);

          return (
            <Badge
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              className={cn(
                'cursor-pointer select-none',
                tokens.animation.card,
                isActive && 'pr-1'
              )}
              onClick={() => onToggle(filter.id)}
            >
              <span className="flex items-center gap-1.5">
                {filter.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: filter.color }}
                  />
                )}
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <span className="text-xs opacity-70">({filter.count})</span>
                )}
                {isActive && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </span>
            </Badge>
          );
        })}
      </div>

      {hasActiveFilters && (
        <div className="mt-2 text-xs text-muted-foreground">
          {activeFilters.length} active filter{activeFilters.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test filter pills**

Add to test page:

```tsx
const [activeFilters, setActiveFilters] = useState<string[]>([]);

<CompactFilterPills
  title="Layer Filters"
  filters={[
    { id: 'canopy', label: 'Canopy', color: '#166534', count: 5 },
    { id: 'shrub', label: 'Shrub', color: '#22c55e', count: 12 },
    { id: 'groundcover', label: 'Groundcover', color: '#a3e635', count: 8 }
  ]}
  activeFilters={activeFilters}
  onToggle={(id) => {
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }}
  onClearAll={() => setActiveFilters([])}
/>
```

**Step 3: Visual test**

Expected: Pills toggle active/inactive, show X when active, clear all works

**Step 4: Commit filter pills**

```bash
git add components/map/info-cards/compact-filter-pills.tsx
git commit -m "feat(map-info): add CompactFilterPills component"
```

---

## Task 4: Quick Actions Bar

**Files:**
- Create: `components/map/info-cards/quick-actions-bar.tsx`

**Step 1: Create QuickActionsBar component**

```tsx
// components/map/info-cards/quick-actions-bar.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  badge?: string | number;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionsBar({ actions, className }: QuickActionsBarProps) {
  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg',
      tokens.spacing.card.padding,
      className
    )}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              className={cn(
                'flex flex-col items-center justify-center h-auto py-3 gap-2 relative',
                tokens.animation.card
              )}
              onClick={action.onClick}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
              {action.badge && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Test quick actions**

Add to test page:

```tsx
import { Leaf, Square, Droplets, Sparkles } from 'lucide-react';

<QuickActionsBar
  actions={[
    { id: 'plant', label: 'Add Plant', icon: Leaf, onClick: () => alert('Add plant') },
    { id: 'zone', label: 'Draw Zone', icon: Square, onClick: () => alert('Draw zone') },
    { id: 'water', label: 'Water System', icon: Droplets, onClick: () => alert('Water'), badge: 3 },
    { id: 'guild', label: 'Build Guild', icon: Sparkles, onClick: () => alert('Guild') }
  ]}
/>
```

**Step 3: Commit quick actions**

```bash
git add components/map/info-cards/quick-actions-bar.tsx
git commit -m "feat(map-info): add QuickActionsBar component"
```

---

## Task 5: Redesigned Map Info Sheet Container

**Files:**
- Create: `components/map/redesigned-map-info-sheet.tsx`
- Modify: `components/map/farm-map.tsx` (add feature flag)

**Step 1: Create redesigned container**

```tsx
// components/map/redesigned-map-info-sheet.tsx
'use client';

import { useState } from 'react';
import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStatsCard } from './info-cards/quick-stats-card';
import { CompactFilterPills } from './info-cards/compact-filter-pills';
import { QuickActionsBar } from './info-cards/quick-actions-bar';

interface RedesignedMapInfoSheetProps {
  // Stats
  plantingCount: number;
  zoneCount: number;
  functionCount: number;

  // Filters
  layerFilters: Array<{ id: string; label: string; color: string; count: number }>;
  activeLayerFilters: string[];
  onToggleLayerFilter: (id: string) => void;

  vitalFilters: Array<{ id: string; label: string; count: number }>;
  activeVitalFilters: string[];
  onToggleVitalFilter: (id: string) => void;

  // Actions
  onAddPlant: () => void;
  onDrawZone: () => void;
  onWaterSystem: () => void;
  onBuildGuild: () => void;

  // Additional content
  children?: React.ReactNode;
}

export function RedesignedMapInfoSheet({
  plantingCount,
  zoneCount,
  functionCount,
  layerFilters,
  activeLayerFilters,
  onToggleLayerFilter,
  vitalFilters,
  activeVitalFilters,
  onToggleVitalFilter,
  onAddPlant,
  onDrawZone,
  onWaterSystem,
  onBuildGuild,
  children
}: RedesignedMapInfoSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'filters' | 'advanced'>('overview');

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 z-20',
        'bg-background/95 backdrop-blur-md',
        'border-t border-border',
        tokens.shadows.drawer,
        tokens.animation.slide
      )}
      data-map-info-sheet
    >
      {/* Collapsed Peek Bar */}
      {!isExpanded && (
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpanded(true)}
              className={cn(tokens.typography.subtitle, 'hover:text-foreground transition-colors')}
            >
              Map Info ▲
            </button>

            {/* Mini stats */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span>🌱 {plantingCount}</span>
              <span>▢ {zoneCount}</span>
              <span>⚡ {functionCount} functions</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-7"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Header with section tabs */}
          <div className="border-b border-border bg-card/50">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex gap-1">
                <Button
                  variant={activeSection === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('overview')}
                  className="h-8 text-xs"
                >
                  Overview
                </Button>
                <Button
                  variant={activeSection === 'filters' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('filters')}
                  className="h-8 text-xs"
                >
                  Filters
                </Button>
                <Button
                  variant={activeSection === 'advanced' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSection('advanced')}
                  className="h-8 text-xs"
                >
                  Advanced
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-7"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="overflow-y-auto max-h-[60vh] overscroll-contain">
            <div className="p-4 space-y-3">
              {activeSection === 'overview' && (
                <>
                  <QuickActionsBar
                    actions={[
                      { id: 'plant', label: 'Add Plant', icon: require('lucide-react').Leaf, onClick: onAddPlant },
                      { id: 'zone', label: 'Draw Zone', icon: require('lucide-react').Square, onClick: onDrawZone },
                      { id: 'water', label: 'Water System', icon: require('lucide-react').Droplets, onClick: onWaterSystem },
                      { id: 'guild', label: 'Build Guild', icon: require('lucide-react').Sparkles, onClick: onBuildGuild }
                    ]}
                  />

                  <QuickStatsCard
                    title="Farm Overview"
                    stats={[
                      { label: 'Plantings', value: plantingCount, icon: require('lucide-react').Sprout, color: 'success' },
                      { label: 'Zones', value: zoneCount, icon: require('lucide-react').Square, color: 'info' },
                      { label: 'Functions', value: functionCount, icon: require('lucide-react').Activity, color: 'warning' },
                      { label: 'Coverage', value: '78%', icon: require('lucide-react').TrendingUp, color: 'success' }
                    ]}
                  />
                </>
              )}

              {activeSection === 'filters' && (
                <>
                  <CompactFilterPills
                    title="Layer Filters"
                    filters={layerFilters}
                    activeFilters={activeLayerFilters}
                    onToggle={onToggleLayerFilter}
                    onClearAll={() => layerFilters.forEach(f => onToggleLayerFilter(f.id))}
                  />

                  <CompactFilterPills
                    title="Function Filters"
                    filters={vitalFilters}
                    activeFilters={activeVitalFilters}
                    onToggle={onToggleVitalFilter}
                    onClearAll={() => vitalFilters.forEach(f => onToggleVitalFilter(f.id))}
                  />
                </>
              )}

              {activeSection === 'advanced' && (
                <div className="space-y-4">
                  {children}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Add feature flag to environment**

Add to `.env.local`:
```
NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET=false
```

**Step 3: Commit redesigned sheet**

```bash
git add components/map/redesigned-map-info-sheet.tsx
git commit -m "feat(map-info): add redesigned info sheet container"
```

---

## Task 6: Integration with Farm Map

**Files:**
- Modify: `components/map/farm-map.tsx:3590-3605`

**Step 1: Add feature flag check**

```tsx
// In farm-map.tsx, around line 3590
import { RedesignedMapInfoSheet } from './redesigned-map-info-sheet';

const useRedesignedSheet = process.env.NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET === 'true';

// Replace MapBottomDrawer with conditional rendering:
{useRedesignedSheet ? (
  <RedesignedMapInfoSheet
    plantingCount={filteredPlantings.length}
    zoneCount={zones.filter(z => z.zone_type !== 'farm_boundary').length}
    functionCount={12} // Calculate from plantings
    layerFilters={[
      { id: 'canopy', label: 'Canopy', color: '#166534', count: filteredPlantings.filter(p => p.layer === 'canopy').length },
      // ... other layers
    ]}
    activeLayerFilters={plantingFilters}
    onToggleLayerFilter={toggleLayerFilter}
    vitalFilters={[
      { id: 'nitrogen_fixer', label: 'N-Fixers', count: 0 },
      // ... other vitals
    ]}
    activeVitalFilters={vitalFilters}
    onToggleVitalFilter={toggleVitalFilter}
    onAddPlant={() => {
      setPlantingMode(true);
      setShowSpeciesPicker(true);
    }}
    onDrawZone={() => {
      // Trigger drawing mode
    }}
    onWaterSystem={() => {
      // Open water system
    }}
    onBuildGuild={() => {
      // Open guild builder
    }}
  >
    {/* Advanced content like time machine */}
  </RedesignedMapInfoSheet>
) : (
  <MapBottomDrawer {...existingProps} />
)}
```

**Step 2: Test with feature flag**

```bash
# Enable redesigned sheet
NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET=true npm run dev
```

Expected: New info sheet appears, all interactions work

**Step 3: Commit integration**

```bash
git add components/map/farm-map.tsx .env.local
git commit -m "feat(map-info): integrate redesigned sheet with feature flag"
```

---

## Task 7: Mobile Responsive Optimizations

**Files:**
- Modify: `components/map/redesigned-map-info-sheet.tsx`

**Step 1: Add mobile-specific layouts**

```tsx
// In RedesignedMapInfoSheet, update grid classes:

// QuickActionsBar: Change from grid-cols-4 to grid-cols-2 md:grid-cols-4
// QuickStatsCard: Ensure 2-column on mobile, 4 on desktop
// Add touch-friendly tap targets (min h-11)

// Update collapsed peek bar for mobile:
{!isExpanded && (
  <div className="px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
    <button
      onClick={() => setIsExpanded(true)}
      className="flex-1 text-left"
    >
      <div className={tokens.typography.subtitle}>Map Info</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">🌱 {plantingCount}</span>
        <span className="text-xs text-muted-foreground">▢ {zoneCount}</span>
      </div>
    </button>
    {/* ... */}
  </div>
)}
```

**Step 2: Test on mobile viewport**

```bash
npm run dev
# Open Chrome DevTools, toggle device toolbar
# Test iPhone SE (375px), iPad (768px), Desktop (1920px)
```

Expected: Layout adapts, all buttons tappable, no horizontal scroll

**Step 3: Commit mobile optimizations**

```bash
git add components/map/redesigned-map-info-sheet.tsx
git commit -m "feat(map-info): add mobile responsive optimizations"
```

---

## Task 8: Accessibility Improvements

**Files:**
- Modify: `components/map/info-cards/*.tsx`

**Step 1: Add ARIA labels and keyboard navigation**

```tsx
// In QuickStatsCard:
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Handle action
    }
  }}
  aria-label={`${stat.label}: ${stat.value}`}
  // ... existing props
>

// In CompactFilterPills:
<Badge
  role="checkbox"
  aria-checked={isActive}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(filter.id);
    }
  }}
  // ... existing props
>

// In QuickActionsBar:
<Button
  aria-label={action.label}
  // ... existing props
>
```

**Step 2: Test keyboard navigation**

Manual test:
- Tab through all interactive elements
- Enter/Space activates buttons
- Screen reader announces labels correctly

**Step 3: Commit accessibility**

```bash
git add components/map/info-cards/
git commit -m "feat(map-info): add accessibility improvements"
```

---

## Task 9: Performance Optimizations

**Files:**
- Modify: `components/map/redesigned-map-info-sheet.tsx`

**Step 1: Add memoization for expensive calculations**

```tsx
import { useMemo } from 'react';

// In RedesignedMapInfoSheet:
const layerFilterCounts = useMemo(() => {
  return layerFilters.map(filter => ({
    ...filter,
    count: plantings.filter(p => p.layer === filter.id).length
  }));
}, [layerFilters, plantings]);

const functionStats = useMemo(() => {
  const counts: Record<string, number> = {};
  plantings.forEach(p => {
    try {
      const functions = JSON.parse(p.permaculture_functions || '[]');
      functions.forEach((fn: string) => {
        counts[fn] = (counts[fn] || 0) + 1;
      });
    } catch {}
  });
  return counts;
}, [plantings]);
```

**Step 2: Debounce filter changes**

```tsx
import { useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedFilterChange = useCallback(
  debounce((filterId: string) => {
    onToggleLayerFilter(filterId);
  }, 150),
  [onToggleLayerFilter]
);
```

**Step 3: Commit performance optimizations**

```bash
git add components/map/redesigned-map-info-sheet.tsx
git commit -m "perf(map-info): add memoization and debouncing"
```

---

## Task 10: Documentation and Rollout

**Files:**
- Create: `docs/components/redesigned-map-info-sheet.md`
- Modify: `CLAUDE.md`

**Step 1: Create component documentation**

```markdown
# Redesigned Map Info Sheet

## Overview
The redesigned map info sheet provides quick access to farm statistics, filters, and actions with a modern, card-based layout optimized for both desktop and mobile.

## Components

### QuickStatsCard
Displays key farm metrics in a grid layout.

**Props:**
- `stats`: Array of StatItem
- `title`: Optional section title
- `className`: Additional CSS classes

### CompactFilterPills
Toggle filters with visual pills showing active state.

**Props:**
- `filters`: Array of FilterPill
- `activeFilters`: Array of active filter IDs
- `onToggle`: Callback for filter toggle
- `onClearAll`: Optional clear all callback

### QuickActionsBar
Quick access buttons for common map actions.

**Props:**
- `actions`: Array of QuickAction
- `className`: Additional CSS classes

## Feature Flag
Controlled by `NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET` environment variable.

## Rollout Plan
1. Beta test with feature flag disabled (default)
2. Enable for 10% of users
3. Gather feedback, iterate
4. Full rollout
5. Remove old MapBottomDrawer

## Accessibility
- Full keyboard navigation
- ARIA labels on all interactive elements
- Screen reader friendly
- Touch targets ≥44x44px

## Performance
- Memoized calculations for filter counts
- Debounced filter changes
- Optimized re-renders with React.memo
```

**Step 2: Update CLAUDE.md**

Add section:
```markdown
### Map Info Sheet (Redesigned)

Feature flag: `NEXT_PUBLIC_USE_REDESIGNED_INFO_SHEET`

Components:
- `redesigned-map-info-sheet.tsx` - Main container
- `info-cards/quick-stats-card.tsx` - Stats display
- `info-cards/compact-filter-pills.tsx` - Filter pills
- `info-cards/quick-actions-bar.tsx` - Action buttons

Design tokens: `lib/design/map-info-tokens.ts`
```

**Step 3: Commit documentation**

```bash
git add docs/components/redesigned-map-info-sheet.md CLAUDE.md
git commit -m "docs(map-info): add component documentation and rollout plan"
```

---

## Testing Checklist

- [ ] All components render correctly
- [ ] Stats update when data changes
- [ ] Filters toggle active/inactive state
- [ ] Quick actions trigger correct callbacks
- [ ] Mobile layout responsive (375px to 1920px)
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Performance: no jank on filter changes
- [ ] Feature flag toggles between old/new
- [ ] Dark mode styles correct

---

## Rollout Strategy

**Week 1: Internal Testing**
- Enable flag for development
- Test all user flows
- Fix critical bugs

**Week 2: Beta Users**
- Enable for 10% of users (random selection)
- Monitor analytics for engagement
- Collect feedback via in-app survey

**Week 3: Iteration**
- Address feedback
- Polish interactions
- Performance tuning

**Week 4: Full Rollout**
- Enable for 100% of users
- Monitor for issues
- Plan removal of old component

---

## Success Metrics

- **Engagement:** Click-through rate on quick actions +25%
- **Efficiency:** Time to apply filter <2 seconds (down from 5s)
- **Satisfaction:** User survey rating >4.5/5
- **Performance:** Frame rate >60fps during interactions
- **Accessibility:** 100% keyboard navigable, WCAG AA compliant

---

## Migration Path

Once redesigned sheet is stable:

1. Remove feature flag checks
2. Delete `map-bottom-drawer.tsx`
3. Remove old imports from farm-map.tsx
4. Update all tests to use new component
5. Create migration guide for any custom integrations
