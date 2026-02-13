# Enhanced Zoom for Small Urban Plots - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable zoom levels 19-21 with progressive visual enhancements for precision permaculture design on small urban plots (100-500 sq ft).

**Architecture:** Extend MapLibre's zoom range to level 21 while keeping tile sources locked at maxzoom 18. Implement progressive opacity fading for satellite imagery and enhanced grid/measurement tools at high zoom. All vector layers scale naturally with zoom.

**Tech Stack:** Next.js 14, TypeScript, MapLibre GL JS, @mapbox/mapbox-gl-draw, React hooks

**Design Document:** `docs/plans/2026-02-13-enhanced-zoom-design.md`

---

## Task 1: Create Zoom Enhancement Utilities

**Files:**
- Create: `lib/map/zoom-enhancements.ts`
- Test: Manual verification in browser console

**Step 1: Create zoom utility functions**

Create `lib/map/zoom-enhancements.ts`:

```typescript
/**
 * Zoom Enhancement Utilities
 *
 * Provides calculations for progressive visual enhancements as users zoom
 * beyond the satellite tile limit (zoom 18) up to maximum precision (zoom 21).
 */

export const ZOOM_THRESHOLDS = {
  TILE_MAX: 18,        // Max zoom for satellite tiles
  FADE_START: 18,      // Start fading satellite
  DESIGN_MODE: 19,     // Design mode emphasized
  FINE_GRID: 20,       // Enable fine grid subdivision
  MAX_ZOOM: 21,        // Absolute maximum zoom
} as const;

/**
 * Calculate satellite layer opacity based on zoom level
 * Progressive fade: 100% @ z18 → 60% @ z19 → 40% @ z20 → 30% @ z21
 */
export function getSatelliteOpacity(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 - (zoom - 18) * 0.4; // 1.0 → 0.6
  if (zoom <= 20) return 0.6 - (zoom - 19) * 0.2;  // 0.6 → 0.4
  return Math.max(0.3, 0.4 - (zoom - 20) * 0.1);   // 0.4 → 0.3 (min)
}

/**
 * Calculate grid line thickness based on zoom level
 * Progressive thickening: 1px @ z18 → 1.5px @ z19 → 2px @ z20 → 2.5px @ z21
 */
export function getGridThickness(zoom: number): number {
  if (zoom <= 18) return 1;
  if (zoom <= 19) return 1 + (zoom - 18) * 0.5;    // 1 → 1.5
  if (zoom <= 20) return 1.5 + (zoom - 19) * 0.5;  // 1.5 → 2
  return 2 + (zoom - 20) * 0.5;                     // 2 → 2.5
}

/**
 * Calculate zone boundary thickness based on zoom level
 * Progressive thickening: 2px @ z18 → 3px @ z19 → 4px @ z20 → 5px @ z21
 */
export function getZoneBoundaryThickness(zoom: number): number {
  if (zoom <= 18) return 2;
  if (zoom <= 19) return 2 + (zoom - 18);          // 2 → 3
  if (zoom <= 20) return 3 + (zoom - 19);          // 3 → 4
  return 4 + (zoom - 20);                           // 4 → 5
}

/**
 * Calculate label font size multiplier based on zoom level
 */
export function getLabelSizeMultiplier(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 + (zoom - 18) * 0.1;  // 1.0 → 1.1 (10% increase)
  if (zoom <= 20) return 1.1 + (zoom - 19) * 0.1;  // 1.1 → 1.2 (20% total)
  return 1.2;                                       // Cap at 1.2x
}

/**
 * Calculate planting marker size multiplier based on zoom level
 */
export function getPlantingMarkerSizeMultiplier(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0;                       // No change z18-19
  if (zoom <= 20) return 1.0 + (zoom - 19) * 0.25; // 1.0 → 1.25 (25% increase)
  return 1.25 + (zoom - 20) * 0.25;                 // 1.25 → 1.5 (50% total)
}

/**
 * Determine if fine grid subdivision should be shown
 * Subdivision changes from 50ft to 10ft spacing at zoom 20+
 */
export function shouldShowFineGrid(zoom: number): boolean {
  return zoom >= ZOOM_THRESHOLDS.FINE_GRID;
}

/**
 * Calculate snap-to-grid strength (pixel radius for magnetic snap)
 * No snap below zoom 20, increases to 15px max at zoom 21+
 */
export function getSnapStrength(zoom: number): number {
  if (zoom < 20) return 0;
  return Math.min(15, (zoom - 19) * 5); // 0px @ z19 → 5px @ z20 → 10px @ z21
}

/**
 * Determine if precision mode is active
 */
export function isPrecisionMode(zoom: number): boolean {
  return zoom > ZOOM_THRESHOLDS.FADE_START;
}

/**
 * Get user-friendly zoom level label
 */
export function getZoomLabel(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10; // Round to 1 decimal
  if (zoom > ZOOM_THRESHOLDS.FADE_START) {
    return `Zoom: ${rounded} (Precision Mode)`;
  }
  return `Zoom: ${rounded}`;
}
```

**Step 2: Verify exports**

Run: `npm run type-check` or `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add lib/map/zoom-enhancements.ts
git commit -m "feat(map): add zoom enhancement utility functions

- Add opacity calculation for satellite fade (z18-21)
- Add thickness calculators for grid and zone boundaries
- Add size multipliers for labels and markers
- Add snap-to-grid strength calculator
- Add precision mode detection helpers

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update Map Maximum Zoom Level

**Files:**
- Modify: `components/map/farm-map.tsx:681`
- Test: Manual verification in browser

**Step 1: Update maxZoom configuration**

In `components/map/farm-map.tsx`, find line 681:

```typescript
maxZoom: 18, // Max zoom to ensure tile availability across all layers
```

Change to:

```typescript
maxZoom: 21, // Extended zoom for precision on small urban plots
```

**Step 2: Test in development**

Run: `npm run dev`
Navigate to a farm page
Try zooming in past level 18 using mouse wheel
Expected: Map should allow zooming to level 21

**Step 3: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): extend max zoom from 18 to 21

Enables precision zooming for small urban plots (100-500 sq ft).
Satellite tiles will stop updating at z18 but remain visible.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Lock Tile Sources at Zoom 18

**Files:**
- Modify: `components/map/farm-map.tsx` (satellite, USGS, topo tile sources)

**Step 1: Find and update satellite tile source**

Search for satellite tile source configuration in `farm-map.tsx`. Look for patterns like:

```typescript
satellite: {
  type: "raster",
  tiles: ["..."],
  tileSize: 256,
}
```

Add `maxzoom: 18` to each raster tile source:

```typescript
satellite: {
  type: "raster",
  tiles: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 18, // Lock tiles at z18, prevent requests beyond this level
},
```

**Step 2: Update USGS tile source**

Find USGS source and add `maxzoom: 16` (it already has this limit):

```typescript
usgs: {
  type: "raster",
  tiles: [
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
  ],
  tileSize: 256,
  maxzoom: 16, // USGS tiles max out at 16
},
```

**Step 3: Update terrain/topo sources**

Find any other raster sources and add appropriate maxzoom limits based on provider capabilities.

**Step 4: Test tile locking**

Run: `npm run dev`
Zoom to level 19+ and verify satellite tiles don't attempt to load new imagery (check Network tab)
Expected: No new tile requests beyond zoom 18

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): lock tile sources at their maximum zoom levels

- Satellite tiles locked at z18 (provider max)
- USGS tiles locked at z16 (provider max)
- Prevents 404 requests for tiles beyond provider limits
- Tiles remain visible but frozen at high zoom

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Zoom Change Listener and State

**Files:**
- Modify: `components/map/farm-map.tsx` (add state and listener)

**Step 1: Import zoom enhancements**

At the top of `farm-map.tsx`, add import:

```typescript
import {
  getSatelliteOpacity,
  getGridThickness,
  getZoneBoundaryThickness,
  isPrecisionMode,
  ZOOM_THRESHOLDS,
} from "@/lib/map/zoom-enhancements";
```

**Step 2: Add zoom state**

Find the state declarations near the top of the FarmMap component (around line 122). Add:

```typescript
const [currentZoom, setCurrentZoom] = useState<number>(farm.zoom_level);
```

**Step 3: Create zoom change handler**

Add this function inside the FarmMap component (before the useEffect hooks):

```typescript
// Handle zoom changes for progressive visual enhancements
const handleZoomChange = useCallback(() => {
  if (!map.current) return;

  const zoom = map.current.getZoom();
  setCurrentZoom(zoom);

  // Update satellite opacity if zoom > 18
  if (zoom > ZOOM_THRESHOLDS.FADE_START) {
    const opacity = getSatelliteOpacity(zoom);

    // Update all raster layers
    const style = map.current.getStyle();
    Object.keys(style.sources).forEach((sourceId) => {
      const source = style.sources[sourceId];
      if (source.type === 'raster') {
        // Find layers using this source
        style.layers.forEach((layer) => {
          if (layer.type === 'raster' && 'source' in layer && layer.source === sourceId) {
            map.current!.setPaintProperty(layer.id, 'raster-opacity', opacity);
          }
        });
      }
    });
  }

  // Update grid thickness
  const gridThickness = getGridThickness(zoom);
  if (map.current.getLayer('grid-lines-layer')) {
    map.current.setPaintProperty('grid-lines-layer', 'line-width', gridThickness);
  }

  // Update zone boundary thickness
  const zoneBoundaryThickness = getZoneBoundaryThickness(zoom);
  if (map.current.getLayer('colored-zones-stroke')) {
    map.current.setPaintProperty('colored-zones-stroke', 'line-width', zoneBoundaryThickness);
  }
}, []);
```

**Step 4: Add zoom listener in map initialization**

Find the map initialization useEffect (where `map.current = new maplibregl.Map(...)` is called).

After the map is created and before the `return` statement, add:

```typescript
// Listen for zoom changes
map.current.on('zoom', handleZoomChange);

// Initial call to set correct opacity/thickness
handleZoomChange();
```

**Step 5: Clean up listener on unmount**

In the same useEffect's cleanup function (the `return () => { ... }` part), add:

```typescript
map.current?.off('zoom', handleZoomChange);
```

**Step 6: Test zoom transitions**

Run: `npm run dev`
Zoom from 17 to 21 slowly
Expected:
- Satellite fades progressively
- Grid lines get thicker
- Zone boundaries get thicker

**Step 7: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): add zoom change listener with progressive visual transitions

- Track current zoom level in component state
- Update satellite opacity dynamically (z18-21)
- Increase grid line thickness with zoom
- Increase zone boundary thickness with zoom
- Clean up listener on component unmount

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement Fine Grid Subdivision

**Files:**
- Modify: `lib/map/measurement-grid.ts`
- Modify: `components/map/farm-map.tsx` (grid regeneration logic)

**Step 1: Read current grid generation code**

First, examine the current `generateGridLines` function to understand its structure.

**Step 2: Add subdivision parameter to generateGridLines**

In `lib/map/measurement-grid.ts`, update the `generateGridLines` function signature:

```typescript
export function generateGridLines(
  bounds: { north: number; south: number; east: number; west: number },
  unit: GridUnit,
  density: GridDensity,
  subdivision: 'coarse' | 'fine' = 'coarse' // New parameter
): FeatureCollection<LineString>
```

**Step 3: Update spacing calculation**

Inside `generateGridLines`, modify the spacing calculation:

```typescript
// Determine base spacing
let spacing: number;
if (density === 'auto') {
  // ... existing auto logic ...
} else if (density === 'sparse') {
  spacing = unit === 'imperial' ? 100 : 50;
} else if (density === 'dense') {
  spacing = unit === 'imperial' ? 25 : 10;
} else {
  spacing = unit === 'imperial' ? 50 : 25; // default
}

// Apply subdivision for fine grid at high zoom
if (subdivision === 'fine') {
  spacing = spacing / 5; // 50ft → 10ft, 25m → 5m
}
```

**Step 4: Update grid regeneration in farm-map.tsx**

In the zoom change handler, add grid regeneration for fine grid:

```typescript
const handleZoomChange = useCallback(() => {
  if (!map.current) return;

  const zoom = map.current.getZoom();
  setCurrentZoom(zoom);

  // ... existing opacity/thickness updates ...

  // Regenerate grid if crossing fine grid threshold
  const showFine = zoom >= ZOOM_THRESHOLDS.FINE_GRID;
  const currentGridIsFine = gridSubdivision === 'fine'; // Need to track this in state

  if (showFine !== currentGridIsFine) {
    updateGrid(showFine ? 'fine' : 'coarse');
  }
}, []);
```

**Step 5: Add grid subdivision state**

Add state to track current grid subdivision:

```typescript
const [gridSubdivision, setGridSubdivision] = useState<'coarse' | 'fine'>('coarse');
```

**Step 6: Create updateGrid function**

```typescript
const updateGrid = useCallback((subdivision: 'coarse' | 'fine') => {
  if (!map.current) return;

  setGridSubdivision(subdivision);

  // Get current bounds
  const bounds = map.current.getBounds();
  const farmBounds = {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };

  // Regenerate grid with new subdivision
  const gridLines = generateGridLines(farmBounds, gridUnit, gridDensity, subdivision);
  const gridLabels = generateViewportLabels(farmBounds, gridUnit, gridDensity, subdivision);

  // Update map sources
  if (map.current.getSource('grid-lines')) {
    (map.current.getSource('grid-lines') as any).setData(gridLines);
  }
  if (map.current.getSource('grid-labels')) {
    (map.current.getSource('grid-labels') as any).setData(gridLabels);
  }
}, [gridUnit, gridDensity]);
```

**Step 7: Test fine grid subdivision**

Run: `npm run dev`
Zoom to level 20
Expected: Grid automatically subdivides to 10ft/5m spacing
Zoom back to 19
Expected: Grid returns to 50ft/25m spacing

**Step 8: Commit**

```bash
git add lib/map/measurement-grid.ts components/map/farm-map.tsx
git commit -m "feat(map): add fine grid subdivision at zoom 20+

- Add subdivision parameter to generateGridLines
- Automatically switch to 10ft/5m grid at zoom 20+
- Regenerate grid when crossing subdivision threshold
- Track grid subdivision state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add Grid Dimension Labels

**Files:**
- Modify: `lib/map/measurement-grid.ts`

**Step 1: Update generateViewportLabels function**

In `lib/map/measurement-grid.ts`, find the `generateViewportLabels` function. Add dimension labels at grid cell corners.

After generating the coordinate labels (A1, B2, etc.), add dimension labels:

```typescript
// Add dimension labels for grid cells at zoom 20+
// These show "50ft × 50ft" or "10ft × 10ft" at cell corners
export function generateDimensionLabels(
  bounds: { north: number; south: number; east: number; west: number },
  unit: GridUnit,
  subdivision: 'coarse' | 'fine' = 'coarse'
): FeatureCollection<Point> {
  const features: any[] = [];

  // Calculate spacing
  let spacingFt = subdivision === 'fine' ? 10 : 50;
  let spacingM = subdivision === 'fine' ? 5 : 25;

  const displaySpacing = unit === 'imperial'
    ? `${spacingFt}ft × ${spacingFt}ft`
    : `${spacingM}m × ${spacingM}m`;

  // Calculate grid intersections
  const { latSpacing, lngSpacing } = calculateSpacing(bounds, unit, subdivision);

  // Generate labels at every 4th intersection (to avoid clutter)
  let latCount = 0;
  for (let lat = bounds.south; lat <= bounds.north; lat += latSpacing) {
    latCount++;
    if (latCount % 4 !== 0) continue;

    let lngCount = 0;
    for (let lng = bounds.west; lng <= bounds.east; lng += lngSpacing) {
      lngCount++;
      if (lngCount % 4 !== 0) continue;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          label: displaySpacing,
          type: 'dimension',
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
```

**Step 2: Add dimension labels layer to map**

In `farm-map.tsx`, after the grid labels layer is added, add a dimension labels layer:

```typescript
// Add dimension labels layer (shown at zoom 20+)
map.current.addLayer({
  id: 'grid-dimension-labels-layer',
  type: 'symbol',
  source: 'grid-dimension-labels',
  minzoom: 20, // Only show at high zoom
  layout: {
    'text-field': ['get', 'label'],
    'text-font': ['Open Sans Regular'],
    'text-size': 10,
    'text-anchor': 'center',
  },
  paint: {
    'text-color': '#64748b',
    'text-halo-color': '#ffffff',
    'text-halo-width': 1,
    'text-opacity': 0.7,
  },
});
```

**Step 3: Test dimension labels**

Run: `npm run dev`
Zoom to level 20+
Expected: Small labels showing "10ft × 10ft" or "50ft × 50ft" appear at grid intersections

**Step 4: Commit**

```bash
git add lib/map/measurement-grid.ts components/map/farm-map.tsx
git commit -m "feat(map): add dimension labels to grid cells at zoom 20+

- Show cell dimensions (10ft × 10ft or 50ft × 50ft)
- Labels appear at every 4th intersection to avoid clutter
- Only visible at zoom 20+ (minzoom: 20)
- Semi-transparent with white halo for readability

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Precision Mode Toast Notification

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add toast notification state**

Add state to track if precision mode toast has been shown:

```typescript
const [hasShownPrecisionToast, setHasShownPrecisionToast] = useState(false);
```

**Step 2: Check localStorage on mount**

Add useEffect to check if toast has been shown before:

```typescript
useEffect(() => {
  const shown = localStorage.getItem('precision-mode-toast-shown');
  if (shown === 'true') {
    setHasShownPrecisionToast(true);
  }
}, []);
```

**Step 3: Show toast when crossing zoom 18**

Update the zoom change handler to show toast:

```typescript
const handleZoomChange = useCallback(() => {
  if (!map.current) return;

  const zoom = map.current.getZoom();
  const prevZoom = currentZoom;
  setCurrentZoom(zoom);

  // Show precision mode toast when first crossing zoom 18
  if (!hasShownPrecisionToast && prevZoom <= 18 && zoom > 18) {
    toast({
      title: "🔍 Precision Mode Activated",
      description: "Grid and measurements enhanced for detailed planning",
      duration: 4000,
    });
    setHasShownPrecisionToast(true);
    localStorage.setItem('precision-mode-toast-shown', 'true');
  }

  // ... rest of zoom change logic ...
}, [currentZoom, hasShownPrecisionToast, toast]);
```

**Step 4: Test toast notification**

Run: `npm run dev`
Zoom from 17 to 19
Expected: Toast appears when crossing zoom 18
Reload page and zoom again
Expected: Toast does not appear (already shown in this browser)

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): add precision mode activation toast

- Show toast when user first zooms past level 18
- Display: 'Precision Mode Activated' with grid/measurement info
- Shown once per session, tracked in localStorage
- 4 second duration with auto-dismiss

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Snap-to-Grid Foundation

**Files:**
- Create: `lib/map/snap-to-grid.ts`
- Modify: `components/map/farm-map.tsx`

**Step 1: Create snap-to-grid utility**

Create `lib/map/snap-to-grid.ts`:

```typescript
import { getSnapStrength } from './zoom-enhancements';

/**
 * Calculate the nearest grid intersection to a given coordinate
 */
export function getNearestGridIntersection(
  lng: number,
  lat: number,
  gridSpacingDegrees: number
): { lng: number; lat: number } {
  const snappedLng = Math.round(lng / gridSpacingDegrees) * gridSpacingDegrees;
  const snappedLat = Math.round(lat / gridSpacingDegrees) * gridSpacingDegrees;

  return { lng: snappedLng, lat: snappedLat };
}

/**
 * Calculate distance in pixels between two map coordinates
 */
export function getPixelDistance(
  map: maplibregl.Map,
  coord1: { lng: number; lat: number },
  coord2: { lng: number; lat: number }
): number {
  const point1 = map.project([coord1.lng, coord1.lat]);
  const point2 = map.project([coord2.lng, coord2.lat]);

  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap coordinate to nearest grid intersection if within snap radius
 */
export function snapCoordinate(
  map: maplibregl.Map,
  lng: number,
  lat: number,
  gridSpacingDegrees: number,
  zoom: number,
  enabled: boolean = true
): { lng: number; lat: number; snapped: boolean } {
  if (!enabled) {
    return { lng, lat, snapped: false };
  }

  const snapStrength = getSnapStrength(zoom);

  // No snapping if strength is 0 (zoom < 20)
  if (snapStrength === 0) {
    return { lng, lat, snapped: false };
  }

  const nearest = getNearestGridIntersection(lng, lat, gridSpacingDegrees);
  const distance = getPixelDistance(map, { lng, lat }, nearest);

  // Snap if within radius
  if (distance <= snapStrength) {
    return { ...nearest, snapped: true };
  }

  return { lng, lat, snapped: false };
}

/**
 * Calculate grid spacing in degrees based on unit and subdivision
 */
export function getGridSpacingDegrees(
  unit: 'imperial' | 'metric',
  subdivision: 'coarse' | 'fine',
  latitude: number
): number {
  // Approximate degrees per foot/meter at given latitude
  const feetPerDegree = 364000 * Math.cos(latitude * Math.PI / 180);
  const metersPerDegree = 111320 * Math.cos(latitude * Math.PI / 180);

  let spacingFt = subdivision === 'fine' ? 10 : 50;
  let spacingM = subdivision === 'fine' ? 5 : 25;

  if (unit === 'imperial') {
    return spacingFt / feetPerDegree;
  } else {
    return spacingM / metersPerDegree;
  }
}
```

**Step 2: Add snap-to-grid state**

In `farm-map.tsx`, add state:

```typescript
const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
```

**Step 3: Add keyboard shortcut for snap toggle**

Add keyboard listener:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // S key - toggle snap-to-grid
    if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      setSnapToGridEnabled(prev => {
        const newValue = !prev;
        toast({
          title: `Snap to Grid ${newValue ? 'Enabled' : 'Disabled'}`,
          duration: 2000,
        });
        return newValue;
      });
    }

    // Shift key - temporarily disable snap while held
    if (e.key === 'Shift') {
      setSnapToGridEnabled(false);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // Re-enable snap when Shift is released
    if (e.key === 'Shift') {
      setSnapToGridEnabled(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [toast]);
```

**Step 4: Test snap toggle**

Run: `npm run dev`
Press 'S' key
Expected: Toast shows "Snap to Grid Enabled/Disabled"
Hold Shift key
Expected: Snap temporarily disabled (will verify with drawing in next task)

**Step 5: Commit**

```bash
git add lib/map/snap-to-grid.ts components/map/farm-map.tsx
git commit -m "feat(map): add snap-to-grid foundation and keyboard controls

- Create snap-to-grid utility functions
- Calculate nearest grid intersection
- Determine snap strength based on zoom level
- Add S key to toggle snap on/off
- Add Shift key to temporarily disable snap while held
- Show toast notification when toggling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integrate Snap-to-Grid with Drawing

**Files:**
- Modify: `components/map/farm-map.tsx` (MapboxDraw event handlers)

**Step 1: Import snap utilities**

At top of `farm-map.tsx`:

```typescript
import { snapCoordinate, getGridSpacingDegrees } from "@/lib/map/snap-to-grid";
```

**Step 2: Find MapboxDraw event handlers**

Search for `draw.on('draw.create'` or similar MapboxDraw event listeners in the code.

**Step 3: Add snap to draw update events**

Find or add a handler for `draw.update` events:

```typescript
draw.current.on('draw.update', (e) => {
  if (!map.current || !snapToGridEnabled) return;

  const zoom = map.current.getZoom();
  if (zoom < 20) return; // Only snap at zoom 20+

  const features = e.features;
  const centerLat = farm.center_lat;

  features.forEach((feature: any) => {
    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates;
      const gridSpacing = getGridSpacingDegrees(gridUnit, gridSubdivision, centerLat);
      const snapped = snapCoordinate(map.current!, lng, lat, gridSpacing, zoom, snapToGridEnabled);

      if (snapped.snapped) {
        feature.geometry.coordinates = [snapped.lng, snapped.lat];
        draw.current!.add(feature);
      }
    } else if (feature.geometry.type === 'Polygon') {
      const gridSpacing = getGridSpacingDegrees(gridUnit, gridSubdivision, centerLat);
      let modified = false;

      feature.geometry.coordinates[0] = feature.geometry.coordinates[0].map((coord: number[]) => {
        const [lng, lat] = coord;
        const snapped = snapCoordinate(map.current!, lng, lat, gridSpacing, zoom, snapToGridEnabled);

        if (snapped.snapped) {
          modified = true;
          return [snapped.lng, snapped.lat];
        }
        return coord;
      });

      if (modified) {
        draw.current!.add(feature);
      }
    }
  });
});
```

**Step 4: Add visual snap indicators**

Create temporary markers when near snap points:

```typescript
const [snapIndicators, setSnapIndicators] = useState<maplibregl.Marker[]>([]);

// In handleMouseMove (add this event listener to map)
const handleMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
  if (!map.current || !snapToGridEnabled) return;

  const zoom = map.current.getZoom();
  if (zoom < 20) return;

  const { lng, lat } = e.lngLat;
  const gridSpacing = getGridSpacingDegrees(gridUnit, gridSubdivision, farm.center_lat);
  const snapped = snapCoordinate(map.current, lng, lat, gridSpacing, zoom, snapToGridEnabled);

  // Clear old indicators
  snapIndicators.forEach(m => m.remove());

  if (snapped.snapped) {
    // Show snap indicator
    const el = document.createElement('div');
    el.className = 'snap-indicator';
    el.style.cssText = `
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([snapped.lng, snapped.lat])
      .addTo(map.current);

    setSnapIndicators([marker]);
  } else {
    setSnapIndicators([]);
  }
}, [snapToGridEnabled, gridUnit, gridSubdivision, farm.center_lat, snapIndicators]);

// Add listener
useEffect(() => {
  if (!map.current) return;

  map.current.on('mousemove', handleMouseMove);

  return () => {
    map.current?.off('mousemove', handleMouseMove);
    snapIndicators.forEach(m => m.remove());
  };
}, [handleMouseMove]);
```

**Step 5: Test snap-to-grid drawing**

Run: `npm run dev`
Zoom to level 20+
Try drawing a polygon
Expected: Vertices snap to grid intersections when within 10-15px
Hold Shift and draw
Expected: Vertices placed exactly where you click (no snap)

**Step 6: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): integrate snap-to-grid with drawing tools

- Snap vertices to grid intersections at zoom 20+
- Works for polygons and points
- Show blue dot indicator when near snap point
- Respect snap enabled/disabled state
- Shift key temporarily disables snap during drawing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Add Measurement Overlay Component (Basic)

**Files:**
- Create: `components/map/measurement-overlay.tsx`
- Modify: `components/map/farm-map.tsx`

**Step 1: Create measurement overlay component**

Create `components/map/measurement-overlay.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from 'react';
import type maplibregl from 'maplibre-gl';

interface MeasurementOverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
  unit: 'imperial' | 'metric';
}

interface Measurement {
  id: string;
  start: { lng: number; lat: number };
  end: { lng: number; lat: number };
  distance: number;
}

export function MeasurementOverlay({ map, enabled, unit }: MeasurementOverlayProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate distance between two points
  const calculateDistance = (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number }
  ): number => {
    // Haversine formula
    const R = unit === 'imperial' ? 20902231 : 6371000; // feet or meters
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLng = (end.lng - start.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (unit === 'imperial') {
      if (distance < 3) return `${Math.round(distance * 12)}"`;
      return `${Math.round(distance * 10) / 10}'`;
    } else {
      if (distance < 1) return `${Math.round(distance * 100)} cm`;
      return `${Math.round(distance * 10) / 10} m`;
    }
  };

  // Render measurements on SVG overlay
  useEffect(() => {
    if (!map || !svgRef.current || !enabled) return;

    const updateOverlay = () => {
      // This will be expanded in future tasks to show:
      // - Distance measurements while drawing
      // - Area measurements on hover
      // - Spacing guides for plantings
    };

    map.on('move', updateOverlay);
    map.on('zoom', updateOverlay);
    updateOverlay();

    return () => {
      map.off('move', updateOverlay);
      map.off('zoom', updateOverlay);
    };
  }, [map, enabled, measurements]);

  if (!enabled) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Measurements will be rendered here */}
    </svg>
  );
}
```

**Step 2: Add measurement overlay to farm-map**

In `farm-map.tsx`, import and add the overlay:

```typescript
import { MeasurementOverlay } from './measurement-overlay';

// Inside the return statement, add after the map container:
<MeasurementOverlay
  map={map.current}
  enabled={currentZoom >= 19}
  unit={gridUnit}
/>
```

**Step 3: Test overlay presence**

Run: `npm run dev`
Zoom to 19+
Open browser DevTools and inspect the DOM
Expected: SVG element with class "measurement-overlay" present in the DOM

**Step 4: Commit**

```bash
git add components/map/measurement-overlay.tsx components/map/farm-map.tsx
git commit -m "feat(map): add measurement overlay component foundation

- Create SVG overlay component for measurements
- Enable at zoom 19+ (precision mode)
- Add distance calculation helpers (Haversine formula)
- Add distance formatting (feet/meters)
- Prepare structure for future measurement features

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add Zoom Label Display

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add zoom label component**

In the map controls area (where layer selector, etc. are located), add a zoom level indicator:

```typescript
import { getZoomLabel } from "@/lib/map/zoom-enhancements";

// In the return JSX, add near map controls:
<div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md px-3 py-2 text-sm font-medium text-slate-700">
  {getZoomLabel(currentZoom)}
</div>
```

**Step 2: Style for precision mode**

Update to highlight precision mode:

```typescript
<div className={`absolute top-4 right-4 z-10 rounded-lg shadow-md px-3 py-2 text-sm font-medium transition-colors ${
  currentZoom > 18
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-white text-slate-700'
}`}>
  {getZoomLabel(currentZoom)}
</div>
```

**Step 3: Test zoom label**

Run: `npm run dev`
Zoom in and out
Expected: Zoom level displayed in top-right corner
When zoom > 18: Background turns blue and shows "Precision Mode"

**Step 4: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): add zoom level indicator with precision mode highlight

- Display current zoom level in top-right corner
- Show 'Precision Mode' label when zoom > 18
- Blue highlight background in precision mode
- Updates in real-time as user zooms

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Add Keyboard Shortcuts Help

**Files:**
- Modify: `components/map/farm-map.tsx` (update help menu)

**Step 1: Find help menu content**

Search for where keyboard shortcuts are displayed (likely in a dialog or popover triggered by 'H' key or help icon).

**Step 2: Add new shortcuts to help menu**

Add these shortcuts to the displayed list:

```typescript
const shortcuts = [
  // ... existing shortcuts ...
  { key: 'S', description: 'Toggle snap-to-grid on/off' },
  { key: 'G', description: 'Toggle grid visibility' },
  { key: 'M', description: 'Toggle measurement overlay' },
  { key: 'Shift', description: 'Hold to temporarily disable snap-to-grid' },
];
```

**Step 3: Update help dialog content**

Ensure the help dialog displays these shortcuts clearly with the key on the left and description on the right.

**Step 4: Test help menu**

Run: `npm run dev`
Press 'H' key or click help icon
Expected: Help dialog shows all keyboard shortcuts including new ones (S, G, M, Shift)

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "docs(map): add precision mode shortcuts to help menu

- Document S key (snap-to-grid toggle)
- Document G key (grid visibility)
- Document M key (measurement overlay)
- Document Shift key (temporary snap disable)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Performance Optimization - Debounce Grid Regeneration

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add debounce utility**

At top of file, add or import debounce:

```typescript
// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

**Step 2: Debounce grid updates**

Wrap the grid update function in debounce:

```typescript
const updateGridDebounced = useCallback(
  debounce((subdivision: 'coarse' | 'fine') => {
    updateGrid(subdivision);
  }, 150), // 150ms debounce
  [updateGrid]
);
```

**Step 3: Use debounced version in zoom handler**

Replace `updateGrid` calls with `updateGridDebounced`:

```typescript
const handleZoomChange = useCallback(() => {
  // ... existing code ...

  if (showFine !== currentGridIsFine) {
    updateGridDebounced(showFine ? 'fine' : 'coarse');
  }
}, [/* ... */]);
```

**Step 4: Test performance**

Run: `npm run dev`
Rapidly zoom in and out around level 20
Expected: Grid updates smoothly without excessive regeneration
Check browser console for performance
Expected: No lag or frame drops

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "perf(map): debounce grid regeneration to improve zoom performance

- Add 150ms debounce to grid updates
- Prevents excessive recalculation during rapid zoom changes
- Improves frame rate during continuous zooming
- No visual impact, only performance improvement

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Mobile Touch Target Enhancement

**Files:**
- Modify: `components/map/farm-map.tsx`
- Modify: `lib/map/snap-to-grid.ts`

**Step 1: Detect touch device**

Add touch detection utility:

```typescript
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
```

**Step 2: Increase snap radius on touch devices**

In `lib/map/snap-to-grid.ts`, update `getSnapStrength`:

```typescript
export function getSnapStrength(zoom: number, isTouch: boolean = false): number {
  if (zoom < 20) return 0;

  const baseStrength = Math.min(15, (zoom - 19) * 5);

  // Double snap radius on touch devices
  return isTouch ? baseStrength * 2 : baseStrength;
}
```

**Step 3: Use touch-aware snap in farm-map**

Update snap calls:

```typescript
const isTouch = isTouchDevice();
const snapped = snapCoordinate(
  map.current!,
  lng,
  lat,
  gridSpacing,
  zoom,
  snapToGridEnabled,
  isTouch
);
```

**Step 4: Test on mobile device or emulator**

Run: `npm run dev`
Open DevTools device emulator (mobile mode)
Zoom to 20+ and try drawing
Expected: Snap radius is larger (20-30px instead of 10-15px)

**Step 5: Commit**

```bash
git add lib/map/snap-to-grid.ts components/map/farm-map.tsx
git commit -m "feat(map): enhance touch targets for mobile devices

- Detect touch devices automatically
- Double snap-to-grid radius on touch devices (20-30px)
- Improves precision placement on mobile/tablet
- No change to desktop experience

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Testing and Validation

**Files:**
- Create: `docs/plans/2026-02-13-enhanced-zoom-testing.md`

**Step 1: Create testing checklist document**

Create a markdown file documenting all manual testing steps from the design document.

**Step 2: Perform manual testing**

Go through each item in the testing checklist:

1. Zoom transitions (1-21)
2. Satellite opacity fade
3. Grid thickness increase
4. Fine grid subdivision at zoom 20
5. Snap-to-grid functionality
6. Keyboard shortcuts (S, G, M, Shift)
7. Precision mode toast
8. Zoom level indicator
9. Performance with many plantings
10. Mobile touch interactions

**Step 3: Document any issues found**

If bugs are found, document them in the testing file and create fix commits.

**Step 4: Cross-browser testing**

Test in:
- Chrome (desktop & mobile)
- Firefox (desktop)
- Safari (desktop & iOS)

**Step 5: Commit testing documentation**

```bash
git add docs/plans/2026-02-13-enhanced-zoom-testing.md
git commit -m "test(map): document enhanced zoom testing checklist

- List all manual testing scenarios
- Document cross-browser testing results
- Record any issues found and resolved
- Validate acceptance criteria

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Final Integration and Polish

**Files:**
- Modify: `components/map/farm-map.tsx`
- Modify: Any remaining files needing cleanup

**Step 1: Review all changes**

Run: `git log --oneline --graph -20`
Review all commits made
Expected: Clean, logical progression of features

**Step 2: Code cleanup**

- Remove any console.log statements
- Remove commented-out code
- Ensure consistent formatting
- Add JSDoc comments where helpful

**Step 3: Type check**

Run: `npm run type-check` or `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Lint check**

Run: `npm run lint`
Fix any linting errors
Expected: No linting warnings/errors

**Step 5: Final test in development**

Run: `npm run dev`
Test complete workflow:
1. Create farm
2. Zoom from 15 to 21
3. Verify all features work
4. Check performance
5. Test on mobile viewport

**Step 6: Commit polish changes**

```bash
git add .
git commit -m "chore(map): final polish for enhanced zoom feature

- Remove debug console.log statements
- Clean up commented code
- Fix TypeScript/lint issues
- Add JSDoc documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/features/enhanced-zoom.md`

**Step 1: Document feature in CLAUDE.md**

Add section about enhanced zoom in the map editor section:

```markdown
### Enhanced Zoom (Precision Mode)

The map editor supports zoom levels up to 21 for small urban plots:

- **Zoom 1-18:** Standard behavior, satellite tiles at 100% opacity
- **Zoom 18-21:** Precision mode with progressive enhancements
  - Satellite fades to 30% opacity
  - Grid thickness increases
  - Fine grid subdivision at zoom 20+ (50ft → 10ft spacing)
  - Snap-to-grid at zoom 20+ (toggle with 'S' key)
  - Dimension labels on grid cells

**Keyboard Shortcuts:**
- `S` - Toggle snap-to-grid
- `G` - Toggle grid visibility
- `M` - Toggle measurement overlay
- `Shift` - Hold to temporarily disable snap

**Implementation:**
- Utilities: `lib/map/zoom-enhancements.ts`
- Snap logic: `lib/map/snap-to-grid.ts`
- Grid subdivision: `lib/map/measurement-grid.ts`
```

**Step 2: Create feature documentation**

Create `docs/features/enhanced-zoom.md` with user-facing documentation about how to use the feature.

**Step 3: Commit documentation**

```bash
git add CLAUDE.md docs/features/enhanced-zoom.md
git commit -m "docs: add enhanced zoom feature documentation

- Update CLAUDE.md with precision mode details
- Add feature documentation for users
- Document keyboard shortcuts
- Explain zoom thresholds and transitions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Verification

After completing all tasks, verify these acceptance criteria:

- [ ] Users can zoom to level 21 on small plots
- [ ] Satellite imagery fades gracefully to 30% opacity
- [ ] Grid becomes primary visual reference at high zoom
- [ ] Snap-to-grid provides precision placement within inches
- [ ] No performance issues on mid-range devices
- [ ] All existing features continue to work
- [ ] Mobile experience is smooth and usable

## Future Enhancements (Out of Scope)

These features are documented in the design but NOT implemented in this plan:

- Measurement overlay with real-time distance/area display
- Planting spacing guides showing mature canopy spread
- Distance ruler tool (click two points)
- Compass rose scaling at high zoom
- Zone boundary drop shadows
- Performance monitoring and auto-disable features
- Grid intersection markers (dots at crossings)

These can be implemented in future iterations as needed.

---

## Execution Notes

**Estimated Time:** 3-5 hours for core implementation + 1-2 hours for testing/polish

**Dependencies:**
- Existing map infrastructure (MapLibre, grid system)
- Existing drawing tools (MapboxDraw)
- Toast notification system

**Risk Areas:**
- Performance on low-end devices (mitigated by debouncing)
- Coordinate precision at extreme latitudes (documented limitation)
- Browser compatibility (tested in modern browsers only)

**Testing Strategy:**
- Manual testing in browser at each task
- Cross-browser verification after all tasks
- Mobile testing on real devices if available
- Performance profiling with many plantings

---

**Plan created:** 2026-02-13
**Design reference:** `docs/plans/2026-02-13-enhanced-zoom-design.md`
**Ready for execution:** Yes
