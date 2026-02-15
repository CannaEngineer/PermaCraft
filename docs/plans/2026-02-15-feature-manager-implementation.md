# Feature Manager Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Features tab to MapBottomDrawer for browsing, searching, and navigating farm features (zones, plantings, lines, guilds, phases).

**Architecture:** Extend MapBottomDrawer with new tab, create FeatureListPanel component with smart search and three view modes (Type/Layer/Phase). Pure functions for search/grouping logic. Click feature → pan map + open details drawer.

**Tech Stack:** React, TypeScript, MapLibre GL JS, Tailwind CSS, shadcn/ui, local storage for preferences

---

## Prerequisites

- ImmersiveMapEditor already fetches zones, plantings, lines
- MapBottomDrawer has existing tab infrastructure
- onFeatureSelect callback exists for click-to-view
- Design doc: `docs/plans/2026-02-15-feature-manager-design.md`

---

## Part 1: Utility Functions (TDD)

### Task 1: Feature Search Utility

**Files:**
- Create: `lib/map/feature-search.ts`
- Create: `__tests__/lib/map/feature-search.test.ts`

**Step 1: Write failing test for zone search**

Create `__tests__/lib/map/feature-search.test.ts`:

```typescript
import { searchFeatures } from '@/lib/map/feature-search';

describe('searchFeatures', () => {
  const mockFeatures = {
    zones: [
      { id: 'z1', name: 'Kitchen Garden', zone_type: 'zone_1', user_id: 'u1', farm_id: 'f1', geometry: '{}', style: '{}', created_at: 0, updated_at: 0 },
      { id: 'z2', name: 'Food Forest', zone_type: 'zone_2', user_id: 'u1', farm_id: 'f1', geometry: '{}', style: '{}', created_at: 0, updated_at: 0 }
    ],
    plantings: [
      { id: 'p1', common_name: 'Apple Tree', scientific_name: 'Malus domestica', species_id: 's1', farm_id: 'f1', user_id: 'u1', lat: 0, lng: 0, layer: 'canopy', planted_year: 2024, created_at: 0, updated_at: 0 }
    ],
    lines: [],
    guilds: [],
    phases: []
  };

  it('should find zones by name (case-insensitive)', () => {
    const result = searchFeatures(mockFeatures, 'kitchen');
    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].id).toBe('z1');
  });

  it('should find plantings by common name', () => {
    const result = searchFeatures(mockFeatures, 'apple');
    expect(result.plantings).toHaveLength(1);
    expect(result.plantings[0].id).toBe('p1');
  });

  it('should find plantings by scientific name', () => {
    const result = searchFeatures(mockFeatures, 'malus');
    expect(result.plantings).toHaveLength(1);
  });

  it('should return all features when query is empty', () => {
    const result = searchFeatures(mockFeatures, '');
    expect(result.zones).toHaveLength(2);
    expect(result.plantings).toHaveLength(1);
  });

  it('should return empty arrays when no matches found', () => {
    const result = searchFeatures(mockFeatures, 'xyz123');
    expect(result.zones).toHaveLength(0);
    expect(result.plantings).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- feature-search.test.ts`
Expected: FAIL with "Cannot find module '@/lib/map/feature-search'"

**Step 3: Create feature-search.ts with types**

Create `lib/map/feature-search.ts`:

```typescript
export interface AllFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

export interface FilteredFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

export function searchFeatures(features: AllFeatures, query: string): FilteredFeatures {
  // Return empty structure
  return {
    zones: [],
    plantings: [],
    lines: [],
    guilds: [],
    phases: []
  };
}
```

**Step 4: Run test to verify it still fails (but different error)**

Run: `npm test -- feature-search.test.ts`
Expected: FAIL with "expected 2, received 0" (empty arrays instead of filtered)

**Step 5: Implement search logic**

Update `lib/map/feature-search.ts`:

```typescript
export interface AllFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

export interface FilteredFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

/**
 * Search features across multiple fields (case-insensitive substring matching)
 */
export function searchFeatures(features: AllFeatures, query: string): FilteredFeatures {
  const normalizedQuery = query.toLowerCase().trim();

  // Empty query returns all features
  if (!normalizedQuery) {
    return features;
  }

  return {
    zones: features.zones.filter((zone) =>
      matchesZone(zone, normalizedQuery)
    ),
    plantings: features.plantings.filter((planting) =>
      matchesPlanting(planting, normalizedQuery)
    ),
    lines: features.lines.filter((line) =>
      matchesLine(line, normalizedQuery)
    ),
    guilds: features.guilds.filter((guild) =>
      matchesGuild(guild, normalizedQuery)
    ),
    phases: features.phases.filter((phase) =>
      matchesPhase(phase, normalizedQuery)
    ),
  };
}

function matchesZone(zone: any, query: string): boolean {
  return (
    zone.name?.toLowerCase().includes(query) ||
    zone.zone_type?.toLowerCase().includes(query)
  );
}

function matchesPlanting(planting: any, query: string): boolean {
  // Search: common name, scientific name, layer
  if (
    planting.common_name?.toLowerCase().includes(query) ||
    planting.scientific_name?.toLowerCase().includes(query) ||
    planting.layer?.toLowerCase().includes(query)
  ) {
    return true;
  }

  // Search permaculture functions (if stored as JSON string)
  if (planting.permaculture_functions) {
    try {
      const functions: string[] = JSON.parse(planting.permaculture_functions);
      return functions.some((fn) => fn.toLowerCase().includes(query));
    } catch {
      // Ignore parse errors
    }
  }

  return false;
}

function matchesLine(line: any, query: string): boolean {
  return (
    line.label?.toLowerCase().includes(query) ||
    line.line_type?.toLowerCase().includes(query)
  );
}

function matchesGuild(guild: any, query: string): boolean {
  return guild.name?.toLowerCase().includes(query);
}

function matchesPhase(phase: any, query: string): boolean {
  return (
    phase.name?.toLowerCase().includes(query) ||
    phase.description?.toLowerCase().includes(query)
  );
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- feature-search.test.ts`
Expected: PASS (all 5 tests)

**Step 7: Commit**

```bash
git add lib/map/feature-search.ts __tests__/lib/map/feature-search.test.ts
git commit -m "feat(search): add feature search utility with tests

- Case-insensitive substring matching
- Searches zones, plantings, lines, guilds, phases
- Searches across names, types, functions, layers
- Returns filtered features or all if query empty

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Feature Grouping Utilities

**Files:**
- Create: `lib/map/feature-grouping.ts`
- Create: `__tests__/lib/map/feature-grouping.test.ts`

**Step 1: Write failing test for groupByType**

Create `__tests__/lib/map/feature-grouping.test.ts`:

```typescript
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';

describe('feature-grouping', () => {
  const mockFeatures = {
    zones: [
      { id: 'z1', name: 'Kitchen Garden', zone_type: 'zone_1' },
      { id: 'z2', name: 'Food Forest', zone_type: 'zone_2' }
    ],
    plantings: [
      { id: 'p1', common_name: 'Apple Tree', scientific_name: 'Malus domestica', layer: 'canopy' },
      { id: 'p2', common_name: 'Comfrey', scientific_name: 'Symphytum officinale', layer: 'herbaceous' }
    ],
    lines: [{ id: 'l1', label: 'Swale #1', line_type: 'swale' }],
    guilds: [{ id: 'g1', name: 'Apple Guild' }],
    phases: [{ id: 'ph1', name: 'Year 1', start_year: 2024 }]
  };

  describe('groupByType', () => {
    it('should group features by type', () => {
      const result = groupByType(mockFeatures);
      expect(result).toHaveProperty('Zones');
      expect(result).toHaveProperty('Plantings');
      expect(result).toHaveProperty('Lines');
      expect(result).toHaveProperty('Guilds');
      expect(result).toHaveProperty('Phases');
      expect(result.Zones).toHaveLength(2);
      expect(result.Plantings).toHaveLength(2);
    });

    it('should sort zones alphabetically by name', () => {
      const result = groupByType(mockFeatures);
      expect(result.Zones[0].name).toBe('Food Forest');
      expect(result.Zones[1].name).toBe('Kitchen Garden');
    });

    it('should handle empty feature arrays', () => {
      const emptyFeatures = { zones: [], plantings: [], lines: [], guilds: [], phases: [] };
      const result = groupByType(emptyFeatures);
      expect(result.Zones).toHaveLength(0);
    });
  });

  describe('groupByLayer', () => {
    it('should group plantings by layer', () => {
      const result = groupByLayer(mockFeatures);
      expect(result).toHaveProperty('Canopy');
      expect(result).toHaveProperty('Herbaceous');
      expect(result.Canopy).toHaveLength(1);
      expect(result.Herbaceous).toHaveLength(1);
    });

    it('should put non-plantings in Other Features group', () => {
      const result = groupByLayer(mockFeatures);
      expect(result).toHaveProperty('Other Features');
      expect(result['Other Features'].length).toBeGreaterThan(0);
    });
  });

  describe('groupByPhase', () => {
    const mockPhases = [
      { id: 'ph1', name: 'Year 1', start_year: 2024, end_year: 2024 },
      { id: 'ph2', name: 'Year 2-3', start_year: 2025, end_year: 2026 }
    ];

    const featuresWithPhases = {
      ...mockFeatures,
      plantings: [
        { id: 'p1', common_name: 'Apple', planted_year: 2024 },
        { id: 'p2', common_name: 'Pear', planted_year: 2025 }
      ]
    };

    it('should group features by phase', () => {
      const result = groupByPhase(featuresWithPhases, mockPhases);
      expect(result).toHaveProperty('Year 1');
      expect(result).toHaveProperty('Year 2-3');
    });

    it('should put unscheduled features in Unscheduled group', () => {
      const result = groupByPhase(mockFeatures, mockPhases);
      expect(result).toHaveProperty('Unscheduled');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- feature-grouping.test.ts`
Expected: FAIL with "Cannot find module '@/lib/map/feature-grouping'"

**Step 3: Create feature-grouping.ts skeleton**

Create `lib/map/feature-grouping.ts`:

```typescript
import { AllFeatures } from './feature-search';

export interface GroupedFeatures {
  [groupName: string]: any[];
}

export function groupByType(features: AllFeatures): GroupedFeatures {
  return {};
}

export function groupByLayer(features: AllFeatures): GroupedFeatures {
  return {};
}

export function groupByPhase(features: AllFeatures, phases: any[]): GroupedFeatures {
  return {};
}
```

**Step 4: Run test to verify it still fails (but different error)**

Run: `npm test -- feature-grouping.test.ts`
Expected: FAIL with "expected property 'Zones'" (empty object instead of grouped)

**Step 5: Implement groupByType**

Update `lib/map/feature-grouping.ts`:

```typescript
import { AllFeatures } from './feature-search';

export interface GroupedFeatures {
  [groupName: string]: any[];
}

export function groupByType(features: AllFeatures): GroupedFeatures {
  return {
    'Zones': [...features.zones].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    'Plantings': [...features.plantings].sort((a, b) => (a.common_name || '').localeCompare(b.common_name || '')),
    'Lines': [...features.lines].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    'Guilds': [...features.guilds].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    'Phases': [...features.phases].sort((a, b) => (a.start_year || 0) - (b.start_year || 0))
  };
}

export function groupByLayer(features: AllFeatures): GroupedFeatures {
  const groups: GroupedFeatures = {
    'Canopy': [],
    'Understory': [],
    'Shrub': [],
    'Herbaceous': [],
    'Groundcover': [],
    'Vine': [],
    'Root': [],
    'Unassigned': [],
    'Other Features': []
  };

  // Group plantings by layer
  features.plantings.forEach((planting) => {
    const layer = planting.layer;
    if (layer) {
      const groupName = layer.charAt(0).toUpperCase() + layer.slice(1);
      if (groups[groupName]) {
        groups[groupName].push(planting);
      } else {
        groups['Unassigned'].push(planting);
      }
    } else {
      groups['Unassigned'].push(planting);
    }
  });

  // Put other features in "Other Features"
  groups['Other Features'] = [
    ...features.zones,
    ...features.lines,
    ...features.guilds,
    ...features.phases
  ];

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

export function groupByPhase(features: AllFeatures, phases: any[]): GroupedFeatures {
  const groups: GroupedFeatures = {};

  // Create group for each phase
  phases.forEach((phase) => {
    groups[phase.name] = [];
  });

  // Add "Unscheduled" group
  groups['Unscheduled'] = [];

  // Helper to find phase for a year
  const findPhaseForYear = (year: number | null | undefined) => {
    if (!year) return null;
    return phases.find(
      (phase) => year >= (phase.start_year || 0) && year <= (phase.end_year || 9999)
    );
  };

  // Group plantings by planted_year
  features.plantings.forEach((planting) => {
    const phase = findPhaseForYear(planting.planted_year);
    if (phase) {
      groups[phase.name].push(planting);
    } else {
      groups['Unscheduled'].push(planting);
    }
  });

  // Add zones, lines, guilds to Unscheduled for now (can enhance later with phase_id)
  groups['Unscheduled'].push(...features.zones, ...features.lines, ...features.guilds);

  return groups;
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- feature-grouping.test.ts`
Expected: PASS (all tests)

**Step 7: Commit**

```bash
git add lib/map/feature-grouping.ts __tests__/lib/map/feature-grouping.test.ts
git commit -m "feat(grouping): add feature grouping utilities with tests

- groupByType: groups by Zones/Plantings/Lines/Guilds/Phases
- groupByLayer: groups plantings by permaculture layer
- groupByPhase: groups by implementation timeline
- Includes sorting logic (alphabetical, chronological)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 2: Feature List Panel Component

### Task 3: Create FeatureListPanel Component Skeleton

**Files:**
- Create: `components/map/feature-list-panel.tsx`

**Step 1: Create component file with interface**

Create `components/map/feature-list-panel.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FeatureListPanelProps {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<any>;
}

type ViewMode = 'type' | 'layer' | 'phase';

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar - TODO */}
        <div className="text-sm text-muted-foreground">
          Search bar coming soon
        </div>

        {/* View Tabs - TODO */}
        <div className="text-sm text-muted-foreground">
          View tabs coming soon
        </div>

        {/* Feature List - TODO */}
        <div className="text-sm text-muted-foreground">
          Feature list coming soon
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify component renders without errors**

Check: Component compiles without TypeScript errors
Expected: No errors

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): create FeatureListPanel component skeleton

- Props interface for zones, plantings, lines, guilds, phases
- State for searchQuery, activeView, expandedGroups
- Placeholder UI for search, tabs, and list

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Add Search Bar with Debounce

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Add search bar UI**

Update the search bar section in `components/map/feature-list-panel.tsx`:

```typescript
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';

// ... existing interface and types ...

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply search filter
  const filteredFeatures = useMemo(() => {
    const allFeatures = { zones, plantings, lines, guilds, phases };
    return searchFeatures(allFeatures, debouncedQuery);
  }, [zones, plantings, lines, guilds, phases, debouncedQuery]);

  // Calculate result count
  const resultCount = useMemo(() => {
    return (
      filteredFeatures.zones.length +
      filteredFeatures.plantings.length +
      filteredFeatures.lines.length +
      filteredFeatures.guilds.length +
      filteredFeatures.phases.length
    );
  }, [filteredFeatures]);

  const totalCount = zones.length + plantings.length + lines.length + guilds.length + phases.length;

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search features"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Result count */}
        {debouncedQuery && (
          <div className="text-xs text-muted-foreground">
            {resultCount} result{resultCount !== 1 ? 's' : ''} for "{debouncedQuery}"
          </div>
        )}

        {/* View Tabs - TODO */}
        <div className="text-sm text-muted-foreground">
          View tabs coming soon
        </div>

        {/* Feature List - TODO */}
        <div className="text-sm text-muted-foreground">
          {resultCount} features to display
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test search bar manually**

Check: Type in search bar, verify debounce works (300ms delay)
Expected: Result count updates after 300ms delay

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): add search bar with debounce

- Search input with magnifying glass icon
- Clear button (X) when text entered
- 300ms debounce for performance
- Result count display when searching
- Uses searchFeatures utility

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add View Tabs (Type/Layer/Phase)

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Add view tabs UI**

Update the view tabs section in `components/map/feature-list-panel.tsx`:

```typescript
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';

// ... existing code ...

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ... existing search logic ...

  // Load active view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feature-list-view');
    if (saved === 'type' || saved === 'layer' || saved === 'phase') {
      setActiveView(saved);
    }
  }, []);

  // Save active view preference to localStorage
  const handleViewChange = (view: ViewMode) => {
    setActiveView(view);
    localStorage.setItem('feature-list-view', view);
    // Expand all groups when switching views
    setExpandedGroups(new Set());
  };

  // Group features based on active view
  const groupedFeatures = useMemo(() => {
    if (activeView === 'type') {
      return groupByType(filteredFeatures);
    } else if (activeView === 'layer') {
      return groupByLayer(filteredFeatures);
    } else {
      return groupByPhase(filteredFeatures, phases);
    }
  }, [activeView, filteredFeatures, phases]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        {/* ... existing search bar code ... */}

        {/* View Tabs */}
        <div className="flex gap-1 border-b border-border">
          <Button
            variant={activeView === 'type' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('type')}
            className="rounded-b-none"
          >
            By Type
          </Button>
          <Button
            variant={activeView === 'layer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('layer')}
            className="rounded-b-none"
          >
            By Layer
          </Button>
          <Button
            variant={activeView === 'phase' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('phase')}
            className="rounded-b-none"
          >
            By Phase
          </Button>
        </div>

        {/* Feature List - TODO */}
        <div className="text-sm text-muted-foreground">
          Groups: {Object.keys(groupedFeatures).join(', ')}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test view tabs manually**

Check: Click each tab, verify groupedFeatures changes
Expected: Groups change based on active view

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): add view tabs (Type/Layer/Phase)

- Three tab buttons with active state styling
- Switches grouping logic based on active view
- Persists preference in localStorage
- Expands all groups when switching views
- Uses grouping utilities

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Collapsible Groups

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Add group rendering logic**

Update the feature list section in `components/map/feature-list-panel.tsx`:

```typescript
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Square, Sprout, Minus, Sparkles, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';

// ... existing code ...

// Icon mapping
const getGroupIcon = (groupName: string) => {
  if (groupName === 'Zones') return Square;
  if (groupName === 'Plantings' || groupName.match(/Canopy|Understory|Shrub|Herbaceous|Groundcover|Vine|Root/)) return Sprout;
  if (groupName === 'Lines') return Minus;
  if (groupName === 'Guilds') return Sparkles;
  if (groupName === 'Phases' || groupName.match(/Year|Unscheduled/)) return Calendar;
  return Square;
};

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  // ... existing state and logic ...

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        {/* ... existing search bar code ... */}

        {/* View Tabs */}
        {/* ... existing view tabs code ... */}

        {/* Feature List */}
        <div className="space-y-2 overflow-y-auto max-h-[400px]">
          {Object.entries(groupedFeatures).map(([groupName, features]) => {
            const isExpanded = expandedGroups.has(groupName);
            const Icon = getGroupIcon(groupName);

            return (
              <div key={groupName} className="border rounded-md">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {groupName} ({features.length})
                  </span>
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="pl-8 pr-2 pb-2 space-y-1">
                    {features.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">
                        No features in this group
                      </div>
                    ) : (
                      features.map((feature: any) => (
                        <div
                          key={feature.id}
                          className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                          onClick={() => {
                            // TODO: Determine feature type and call onFeatureSelect
                            console.log('Feature clicked:', feature);
                          }}
                        >
                          <div className="text-sm">
                            {feature.name || feature.common_name || feature.label || 'Unnamed'}
                          </div>
                          {feature.scientific_name && (
                            <div className="text-xs text-muted-foreground">
                              {feature.scientific_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {Object.keys(groupedFeatures).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No features yet.</p>
            <p className="text-xs mt-2">Use the FAB to add zones, plantings, or lines.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Test collapsible groups manually**

Check: Click group headers, verify expand/collapse works
Expected: Groups expand/collapse with chevron rotation

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): add collapsible groups with icons

- Collapsible group headers with chevron icons
- Icons for each group type (Zones, Plantings, Lines, etc.)
- Hover states for groups and items
- Empty state message when no features
- Click handler placeholder for feature items

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Add Feature Click Handler with Map Panning

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Add helper function to get feature coordinates**

Add to `components/map/feature-list-panel.tsx`:

```typescript
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Square, Sprout, Minus, Sparkles, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';
import turf from '@turf/turf';

// ... existing code ...

/**
 * Get center coordinates for a feature
 */
function getFeatureCoordinates(feature: any, featureType: string): [number, number] | null {
  if (featureType === 'planting') {
    // Plantings are points
    return [feature.lng, feature.lat];
  }

  if (featureType === 'zone' || featureType === 'line') {
    // Zones and lines have GeoJSON geometry
    if (feature.geometry) {
      try {
        const geojson = typeof feature.geometry === 'string' ? JSON.parse(feature.geometry) : feature.geometry;
        const center = turf.center(geojson);
        return center.geometry.coordinates as [number, number];
      } catch (error) {
        console.error('Failed to parse geometry:', error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Determine feature type from grouped features
 */
function getFeatureType(feature: any, allFeatures: { zones: any[]; plantings: any[]; lines: any[]; guilds: any[]; phases: any[] }): 'zone' | 'planting' | 'line' | 'guild' | 'phase' | null {
  if (allFeatures.zones.some(z => z.id === feature.id)) return 'zone';
  if (allFeatures.plantings.some(p => p.id === feature.id)) return 'planting';
  if (allFeatures.lines.some(l => l.id === feature.id)) return 'line';
  if (allFeatures.guilds.some(g => g.id === feature.id)) return 'guild';
  if (allFeatures.phases.some(p => p.id === feature.id)) return 'phase';
  return null;
}

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  // ... existing state and logic ...

  const allFeatures = useMemo(() => ({ zones, plantings, lines, guilds, phases }), [zones, plantings, lines, guilds, phases]);

  const handleFeatureClick = (feature: any) => {
    const featureType = getFeatureType(feature, allFeatures);
    if (!featureType) return;

    // Pan map to feature
    const coords = getFeatureCoordinates(feature, featureType);
    if (coords && mapRef.current) {
      mapRef.current.flyTo({
        center: coords,
        zoom: 18,
        duration: 500
      });
    }

    // Open details drawer
    onFeatureSelect(feature.id, featureType);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* ... existing search bar and tabs ... */}

        {/* Feature List */}
        <div className="space-y-2 overflow-y-auto max-h-[400px]">
          {Object.entries(groupedFeatures).map(([groupName, features]) => {
            const isExpanded = expandedGroups.has(groupName);
            const Icon = getGroupIcon(groupName);

            return (
              <div key={groupName} className="border rounded-md">
                {/* Group Header */}
                {/* ... existing group header code ... */}

                {/* Group Items */}
                {isExpanded && (
                  <div className="pl-8 pr-2 pb-2 space-y-1">
                    {features.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">
                        No features in this group
                      </div>
                    ) : (
                      features.map((feature: any) => (
                        <div
                          key={feature.id}
                          className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                          onClick={() => handleFeatureClick(feature)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleFeatureClick(feature);
                            }
                          }}
                        >
                          <div className="text-sm truncate">
                            {feature.name || feature.common_name || feature.label || 'Unnamed'}
                          </div>
                          {feature.scientific_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {feature.scientific_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {/* ... existing empty state code ... */}
      </div>
    </div>
  );
}
```

**Step 2: Install @turf/turf if not already installed**

Run: `npm install @turf/turf`
Expected: Package installed successfully

**Step 3: Test feature click manually**

Check: Click a feature, verify map pans and drawer opens
Expected: Map flyTo animation + details drawer opens

**Step 4: Commit**

```bash
git add components/map/feature-list-panel.tsx package.json package-lock.json
git commit -m "feat(features): implement feature click with map panning

- Get feature coordinates (point, polygon centroid, line midpoint)
- Pan map with flyTo animation (500ms, zoom 18)
- Call onFeatureSelect to open details drawer
- Keyboard accessible (Enter key)
- Uses Turf.js for centroid calculation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 3: Integration

### Task 8: Add Features Tab to MapBottomDrawer

**Files:**
- Modify: `components/map/map-bottom-drawer.tsx`

**Step 1: Add Features tab to tab list**

Update `components/map/map-bottom-drawer.tsx`:

```typescript
// Find the Tab type definition and add 'features'
type Tab = 'legend' | 'filters' | 'vitals' | 'settings' | 'timemachine' | 'features';

// Find the TabsList section and add Features tab button
// Around line 200-250 where tab buttons are defined

// Add after Settings tab:
<TabsTrigger value="features" className="flex items-center gap-2">
  <List className="h-4 w-4" />
  Features
</TabsTrigger>
```

**Step 2: Add Features tab content**

Add after the Settings TabsContent section:

```typescript
import { FeatureListPanel } from './feature-list-panel';
import { List } from 'lucide-react';

// In the component props, add:
interface MapBottomDrawerProps {
  // ... existing props ...

  // Feature List props
  onFeatureSelectFromList?: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef?: React.RefObject<any>;
}

// Add near the end of TabsContent sections (before closing </Tabs>):
<TabsContent value="features" className="mt-0 p-0">
  {onFeatureSelectFromList && mapRef ? (
    <FeatureListPanel
      zones={zones}
      plantings={plantings}
      lines={[]} // TODO: Pass lines when available
      guilds={[]} // TODO: Pass guilds when available
      phases={[]} // TODO: Pass phases when available
      onFeatureSelect={onFeatureSelectFromList}
      mapRef={mapRef}
    />
  ) : (
    <div className="p-4 text-sm text-muted-foreground">
      Feature list not available
    </div>
  )}
</TabsContent>
```

**Step 3: Test tab switching**

Check: Click Features tab, verify FeatureListPanel renders
Expected: Features tab shows feature list panel

**Step 4: Commit**

```bash
git add components/map/map-bottom-drawer.tsx
git commit -m "feat(drawer): add Features tab to MapBottomDrawer

- Add 'features' to Tab type union
- Add Features tab button with List icon
- Add TabsContent with FeatureListPanel
- Add props for onFeatureSelectFromList and mapRef

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Wire Up Feature Data in ImmersiveMapEditor

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx`

**Step 1: Fetch guilds and phases data**

Add to the data fetching section in `components/immersive-map/immersive-map-editor.tsx`:

```typescript
// Find where zones and plantings are fetched (useEffect with farm.id dependency)
// Add guild and phase fetching

const [guilds, setGuilds] = useState<any[]>([]);
const [farmPhases, setFarmPhases] = useState<any[]>([]);

useEffect(() => {
  // Existing zone/planting fetch code...

  // Fetch guilds
  fetch(`/api/farms/${farm.id}/guilds`)
    .then(res => res.json())
    .then(data => setGuilds(data.guilds || []))
    .catch(err => console.error('Failed to load guilds:', err));

  // Fetch phases
  fetch(`/api/farms/${farm.id}/phases`)
    .then(res => res.json())
    .then(data => setFarmPhases(data.phases || []))
    .catch(err => console.error('Failed to load phases:', err));
}, [farm.id]);
```

**Step 2: Pass feature data and handlers to FarmMap (which contains MapBottomDrawer)**

Find where `<FarmMap>` is rendered and update MapBottomDrawer props:

```typescript
// In the FarmMap or MapBottomDrawer component usage, add:
<MapBottomDrawer
  // ... existing props ...
  onFeatureSelectFromList={handleFeatureSelect}
  mapRef={mapRef}
  // Pass feature data (if MapBottomDrawer receives zones/plantings directly)
  // Or ensure FarmMap passes them through
/>
```

**Step 3: Verify data flows to FeatureListPanel**

Check: Open Features tab, verify guilds and phases appear (if any exist)
Expected: All feature types visible in "By Type" view

**Step 4: Commit**

```bash
git add components/immersive-map/immersive-map-editor.tsx
git commit -m "feat(editor): wire feature data to MapBottomDrawer

- Fetch guilds and phases on mount
- Pass onFeatureSelect handler to MapBottomDrawer
- Pass mapRef for panning functionality
- Enable full feature list integration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Add Lines Data to Feature List

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx` (or wherever lines are fetched)
- Modify: `components/map/map-bottom-drawer.tsx`

**Step 1: Fetch lines data if not already fetched**

Add to the data fetching section in `components/immersive-map/immersive-map-editor.tsx`:

```typescript
const [lines, setLines] = useState<any[]>([]);

useEffect(() => {
  // Fetch lines
  fetch(`/api/farms/${farm.id}/lines`)
    .then(res => res.json())
    .then(data => setLines(data.lines || []))
    .catch(err => console.error('Failed to load lines:', err));
}, [farm.id]);
```

**Step 2: Pass lines to MapBottomDrawer/FeatureListPanel**

Update the prop passing:

```typescript
<FeatureListPanel
  zones={zones}
  plantings={plantings}
  lines={lines} // Now passed instead of empty array
  guilds={guilds}
  phases={farmPhases}
  onFeatureSelect={onFeatureSelectFromList}
  mapRef={mapRef}
/>
```

**Step 3: Test lines appear in feature list**

Check: Draw a line, verify it appears in Features tab
Expected: Lines group shows in "By Type" view

**Step 4: Commit**

```bash
git add components/immersive-map/immersive-map-editor.tsx components/map/map-bottom-drawer.tsx
git commit -m "feat(features): add lines data to feature list

- Fetch lines from API
- Pass lines to FeatureListPanel
- Lines now appear in By Type view

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Add Search Result Highlighting

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Auto-expand groups with search results**

Update search logic in `components/map/feature-list-panel.tsx`:

```typescript
// After groupedFeatures is calculated, auto-expand groups with results
useEffect(() => {
  if (debouncedQuery) {
    // Expand all groups that have features when searching
    const groupsWithFeatures = Object.entries(groupedFeatures)
      .filter(([_, features]) => features.length > 0)
      .map(([groupName]) => groupName);

    setExpandedGroups(new Set(groupsWithFeatures));
  }
}, [debouncedQuery, groupedFeatures]);
```

**Step 2: Test search highlighting**

Check: Type search query, verify groups auto-expand
Expected: Groups with matches expand automatically

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): auto-expand groups with search results

- Expand groups containing matches when searching
- Collapse empty groups during search
- Improves search UX by showing relevant results

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Add Empty Search State

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Update empty state logic**

Update the empty state section:

```typescript
{/* Empty State */}
{Object.keys(groupedFeatures).length === 0 && !debouncedQuery && (
  <div className="text-center py-8 text-muted-foreground">
    <p className="text-sm">No features yet.</p>
    <p className="text-xs mt-2">Use the FAB to add zones, plantings, or lines.</p>
  </div>
)}

{/* No Search Results */}
{debouncedQuery && resultCount === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <p className="text-sm">No features match "{debouncedQuery}"</p>
    <p className="text-xs mt-2">Try different keywords.</p>
  </div>
)}
```

**Step 2: Test empty search state**

Check: Search for non-existent feature, verify message appears
Expected: "No features match" message shows

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): add empty search state

- Show 'No features match' message for empty searches
- Differentiate between no features and no search results
- Provides helpful feedback to users

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Add Accessibility Improvements

**Files:**
- Modify: `components/map/feature-list-panel.tsx`

**Step 1: Add ARIA labels and roles**

Update component with accessibility attributes:

```typescript
// Search input (already has aria-label)

// Feature list container
<ul role="list" className="space-y-2 overflow-y-auto max-h-[400px]">
  {Object.entries(groupedFeatures).map(([groupName, features]) => {
    // ...
    return (
      <li key={groupName} className="border rounded-md">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors"
          aria-expanded={isExpanded}
          aria-label={`${groupName} group, ${features.length} features`}
        >
          {/* ... */}
        </button>

        {/* Group Items */}
        {isExpanded && (
          <ul role="list" className="pl-8 pr-2 pb-2 space-y-1">
            {features.map((feature: any) => (
              <li
                key={feature.id}
                className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                onClick={() => handleFeatureClick(feature)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFeatureClick(feature);
                  }
                }}
                aria-label={`${feature.name || feature.common_name || feature.label || 'Unnamed'} feature`}
              >
                {/* ... */}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  })}
</ul>
```

**Step 2: Test keyboard navigation**

Check: Tab through features, press Enter to select
Expected: Full keyboard navigation works

**Step 3: Commit**

```bash
git add components/map/feature-list-panel.tsx
git commit -m "feat(features): add accessibility improvements

- Add aria-labels to groups and features
- Add aria-expanded to group headers
- Add role='list' to feature lists
- Support Space key for feature selection
- Full keyboard navigation support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Final Testing & Documentation

**Files:**
- Update: `CLAUDE.md` (add feature manager documentation)

**Step 1: Manual testing checklist**

Test each feature:
- [ ] Search works with debounce
- [ ] View tabs switch correctly (Type/Layer/Phase)
- [ ] Groups expand/collapse
- [ ] Clicking feature pans map + opens details
- [ ] Empty states show correctly
- [ ] Keyboard navigation works
- [ ] Mobile responsive (test on phone/tablet)
- [ ] Local storage persists view preference

**Step 2: Update CLAUDE.md documentation**

Add to `CLAUDE.md` in the Immersive Map Editor section:

```markdown
### Feature Manager Tab

Located in MapBottomDrawer, provides navigation and organization for farm features.

**Features**:
- Smart search across names, species, properties, functions
- Three view modes: By Type, By Layer, By Phase
- Click feature → pan map + open details
- Keyboard accessible
- Responsive design

**Components**:
- `components/map/feature-list-panel.tsx` - Main component
- `lib/map/feature-search.ts` - Search utility
- `lib/map/feature-grouping.ts` - Grouping logic

**Usage**:
```typescript
<FeatureListPanel
  zones={zones}
  plantings={plantings}
  lines={lines}
  guilds={guilds}
  phases={phases}
  onFeatureSelect={handleFeatureSelect}
  mapRef={mapRef}
/>
```

**Local Storage**:
- `feature-list-view` - Active view preference (type/layer/phase)
```

**Step 3: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: add Feature Manager tab documentation

- Document Feature Manager tab in CLAUDE.md
- Add usage examples and component references
- List key features and local storage keys

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 4: Push to remote**

```bash
git push origin main
```

Expected: All changes pushed successfully

---

## Testing Strategy

**Unit Tests** (Jest/Vitest):
- `lib/map/feature-search.test.ts` - Search functions
- `lib/map/feature-grouping.test.ts` - Grouping functions

**Integration Tests** (Manual):
- Search performance with 100+ features
- View switching preserves search query
- Feature click pans map and opens drawer
- Mobile gestures (swipe drawer, tap features)
- Keyboard navigation
- Empty states

**Acceptance Criteria**:
1. ✅ Users can find any feature by name/property in <3 seconds
2. ✅ Users can browse features organized by Type/Layer/Phase
3. ✅ Clicking a feature pans map and opens details
4. ✅ Search performs well with 100+ features (no lag)
5. ✅ Mobile and desktop experiences equally usable
6. ✅ No new API endpoints required

---

## Success Metrics

After implementation:
- Feature navigation time reduced from ~30s (map hunting) to ~3s (search)
- User satisfaction with farm organization improved
- No performance degradation with large farms (100+ features)
- Zero new API calls (uses existing data)

---

## Notes

- All utility functions have unit tests (TDD)
- Component follows existing patterns (MapBottomDrawer tabs)
- No breaking changes to existing features
- Responsive design handled by existing drawer mechanics
- Local storage for user preferences (view mode)
- Accessibility: keyboard navigation, ARIA labels, semantic HTML

---

*Plan ready for execution*
