# Enhanced Zoom for Small Urban Plots - Design Document

**Date:** 2026-02-13
**Status:** Approved
**Target:** Small backyards (100-500 sq ft / 10-50 sq m)
**Precision Goal:** High precision (within inches / 10-20 cm)

## Problem Statement

Currently, Permaculture.Studio's map editor is limited to zoom level 18 (MapLibre's maximum tile availability). For small urban plots (100-500 sq ft), this zoom level doesn't provide enough precision for detailed permaculture design. Users need to place plantings within inches of specific locations, but the current zoom provides roughly 12-18 inches per pixel at the center of the viewport.

Additionally, tile providers (satellite, USGS, terrain) don't provide imagery beyond zoom 18, creating a hard technical limitation.

## Goals

1. **Enable zoom to level 21** (+3 levels beyond current max)
2. **Maintain spatial context** while providing precision
3. **Graceful visual transition** from satellite imagery to design-focused view
4. **Add precision tools** for measurement and placement at high zoom
5. **No performance degradation** on mid-range devices
6. **Mobile-friendly** touch interactions

## Proposed Solution: Hybrid Zoom with Progressive Enhancement

### Architecture Overview

**Core Concept:**
Modify MapLibre configuration to allow zoom levels 1-21 (currently 1-18). Satellite tile sources will be locked at maxzoom 18, meaning they stop requesting new tiles beyond that level but remain visible at reduced opacity. All vector layers (zones, plantings, grid, boundaries) continue scaling naturally with the map's zoom.

**Key Components:**

1. **farm-map.tsx** (main map component):
   - Change `maxZoom: 18` → `maxZoom: 21`
   - Add zoom-aware opacity system for satellite layers
   - Enhance grid line rendering at high zoom
   - Add zoom level listener for progressive enhancements

2. **Tile source configurations**:
   - Keep satellite sources at `maxzoom: 18` (tiles won't update past this)
   - USGS, topo, terrain sources stay at their current limits
   - Creates "frozen but visible" background effect

3. **New utility: `lib/map/zoom-enhancements.ts`**:
   - Calculate opacity curves based on zoom level
   - Calculate scale factors for UI elements
   - Provide snap-to-grid helpers for high zoom
   - Export constants for zoom thresholds

**Data Flow:**
```
User scrolls/pinches to zoom
  ↓
MapLibre zoom changes (1-21 range)
  ↓
Zoom listener fires
  ↓
If zoom > 18:
  - Calculate fade opacity for satellite
  - Scale grid density/thickness
  - Enhance click target sizes
  - Show measurement tools
  ↓
Update map paint properties
```

---

## Visual Transition System

### Progressive Opacity and Enhancement Schedule

**Zoom 1-18 (Current behavior):**
- Satellite tiles: 100% opacity
- Grid lines: Auto-density, shown at zoom 13+
- Zone boundaries: Standard thickness (2-3px)
- Labels: Standard size

**Zoom 18-19 (Light fade begins):**
- Satellite tiles: 100% → 60% opacity (linear interpolation)
- Grid lines: Increase thickness from 1px → 1.5px
- Grid labels: Increase font size by 10%
- Zone boundaries: Increase thickness from 2px → 3px
- Visual cue: Subtle hint that you're entering "design mode"

**Zoom 19-20 (Design mode emphasized):**
- Satellite tiles: 60% → 40% opacity
- Grid lines: 1.5px → 2px, color shifts to higher contrast
- Grid becomes primary visual reference
- Zone boundaries: 3px → 4px
- Planting markers: Increase size by 25%
- Zone labels: Increase font size by 20%
- New feature: Distance measurements appear between selected elements

**Zoom 20-21 (Maximum precision mode):**
- Satellite tiles: 40% → 30% opacity (maintains faint context)
- Grid lines: 2px → 2.5px
- Grid cells show dimension labels (e.g., "10ft × 10ft")
- Zone boundaries: 4px → 5px
- Planting markers: Increase size by 50% from original
- New feature: Snap-to-grid guides (visual indicators when dragging near grid intersections)
- New feature: Real-time ruler tool shows distances as you draw

### Opacity Calculation Formula

```typescript
function getSatelliteOpacity(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 - (zoom - 18) * 0.4; // 1.0 → 0.6
  if (zoom <= 20) return 0.6 - (zoom - 19) * 0.2;  // 0.6 → 0.4
  return Math.max(0.3, 0.4 - (zoom - 20) * 0.1);   // 0.4 → 0.3
}
```

The transition is smooth and continuous - users won't notice discrete "jumps" between zoom levels.

---

## Grid and Measurement Enhancements

### Enhanced Grid System at High Zoom

**1. Adaptive grid density (zoom 20-21):**
- Current grid: 50ft / 25m spacing at all zoom levels
- At zoom 20+: Automatically subdivide to 10ft / 5m spacing
- Grid cells display dimensions in small labels at each corner
- Users can toggle between coarse/fine grid via map controls

**2. Snap-to-grid system:**
- When drawing zones or placing plantings at zoom 20+:
  - Visual indicators (subtle circles/crosses) appear at grid intersections
  - Cursor "magnetically" snaps within 10px of grid points
  - Snap strength increases with zoom level
  - Can be toggled on/off via keyboard shortcut (S key) or UI control

**3. Real-time measurement tools:**
- **While drawing polygons:** Show running perimeter measurement
- **While placing plantings:** Show distance to nearest existing planting
- **Hover on zones:** Show area in sq ft / sq m
- **Distance ruler mode:** Click two points to measure distance (stays visible until dismissed)

**4. Planting spacing guides:**
- When placing a new planting at zoom 20+:
  - Draw circles showing mature spread of nearby plantings
  - Highlight if new planting overlaps with mature canopy zones
  - Show recommended spacing based on selected species' mature width

**5. Visual enhancements:**
- Grid lines change from solid to slightly dashed at zoom 21 (less visually overwhelming)
- Grid intersections marked with small dots for easier targeting
- Zone boundaries get subtle drop shadows for depth
- North arrow (compass rose) scales up and becomes more prominent

**Implementation notes:**
- All enhancements are progressive - they fade in smoothly as you zoom
- Measurements respect the user's selected unit system (imperial/metric)
- Grid subdivision and snap-to-grid can be disabled in settings for users who don't want them

---

## Technical Implementation Details

### File Modifications

**1. `components/map/farm-map.tsx`:**
- Change line 681: `maxZoom: 18` → `maxZoom: 21`
- Add zoom change listener in map initialization:
  ```typescript
  map.current.on('zoom', handleZoomChange);
  ```
- Implement `handleZoomChange` to update paint properties dynamically
- Store current zoom level in component state for conditional rendering

**2. New file: `lib/map/zoom-enhancements.ts`:**
```typescript
export const ZOOM_THRESHOLDS = {
  TILE_MAX: 18,        // Max zoom for satellite tiles
  FADE_START: 18,      // Start fading satellite
  FINE_GRID: 20,       // Enable fine grid subdivision
  MAX_ZOOM: 21,        // Absolute maximum zoom
};

export function getSatelliteOpacity(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 - (zoom - 18) * 0.4;
  if (zoom <= 20) return 0.6 - (zoom - 19) * 0.2;
  return Math.max(0.3, 0.4 - (zoom - 20) * 0.1);
}

export function getGridThickness(zoom: number): number {
  if (zoom <= 18) return 1;
  if (zoom <= 19) return 1 + (zoom - 18) * 0.5;
  if (zoom <= 20) return 1.5 + (zoom - 19) * 0.5;
  return 2 + (zoom - 20) * 0.5;
}

export function shouldShowFineGrid(zoom: number): boolean {
  return zoom >= ZOOM_THRESHOLDS.FINE_GRID;
}

export function getSnapStrength(zoom: number): number {
  // Returns pixel radius for snap-to-grid magnetism
  if (zoom < 20) return 0;
  return Math.min(15, (zoom - 19) * 5);
}
```

**3. Update grid generation (`lib/map/measurement-grid.ts`):**
- Modify `generateGridLines` to accept optional `subdivision` parameter
- When zoom >= 20, generate 5x denser grid (10ft instead of 50ft)
- Add corner dimension labels to grid cells

**4. Map layer paint property updates:**
- Satellite/topo/terrain layers get dynamic opacity:
  ```typescript
  map.current.setPaintProperty('satellite', 'raster-opacity', opacity);
  ```
- Grid layer gets dynamic line-width:
  ```typescript
  map.current.setPaintProperty('grid-lines-layer', 'line-width', thickness);
  ```

**5. Snap-to-grid implementation:**
- In MapboxDraw event handlers, intercept coordinate updates
- Calculate nearest grid intersection
- If within snap radius, adjust coordinates before committing
- Visual feedback: temporary marker at snap point

**6. Measurement overlay component:**
- New component: `components/map/measurement-overlay.tsx`
- Renders SVG overlay on top of map canvas
- Shows real-time measurements, distance rulers, spacing guides
- Position calculated from MapLibre's `project()` method
- Updates on map move/zoom events

### Tile Source Modifications

All raster tile sources explicitly set maxzoom:
```typescript
sources: {
  satellite: {
    type: "raster",
    tiles: ["..."],
    maxzoom: 18,  // Explicitly lock at 18
  }
}
```

### Performance Considerations

- Opacity transitions use CSS transitions for GPU acceleration
- Grid regeneration debounced to avoid excessive recalculation
- Measurement overlays only rendered when zoom >= 19
- Use `requestAnimationFrame` for smooth visual updates

---

## User Experience & Interaction Flow

### Discovery and Onboarding

**1. First-time high-zoom experience:**
- When user first zooms past level 18, show a subtle toast notification:
  - "🔍 **Precision Mode Activated** - Grid and measurements enhanced for detailed planning"
  - Dismiss after 4 seconds or on user interaction
  - Only shown once per session (tracked in localStorage)

**2. Visual feedback during zoom:**
- Smooth, continuous transitions (no jarring jumps)
- Satellite fades gracefully while grid becomes more prominent
- User always maintains spatial context (never loses orientation)
- Zoom controls show current level: "Zoom: 20 (Precision Mode)"

**3. Keyboard shortcuts:**
- **S** - Toggle snap-to-grid on/off
- **G** - Toggle grid visibility
- **M** - Toggle measurement overlay
- **+/-** or mouse wheel - Zoom in/out (standard)
- Shortcuts displayed in help menu (H key or help icon)

**4. Map controls panel updates:**
- Add "Precision Tools" section that appears at zoom 19+
- Toggles for:
  - Snap to Grid (checkbox)
  - Fine Grid (10ft vs 50ft spacing)
  - Show Measurements (checkbox)
  - Show Spacing Guides (checkbox)
- Controls fade in smoothly when available

**5. Mobile experience:**
- Pinch-to-zoom works naturally up to zoom 21
- Snap-to-grid has larger touch targets (20px radius vs 10px desktop)
- Measurement labels are larger and easier to read
- Spacing guides shown on tap-and-hold instead of hover

**6. Performance safeguards:**
- If device struggles (low frame rate detected), show warning:
  - "Performance tip: Disable spacing guides for smoother zooming"
- Auto-disable some visual enhancements on low-end devices
- Grid subdivision limited to viewport bounds (don't calculate off-screen grid)

### Expected User Workflow

1. User creates farm, draws boundary (normal zoom)
2. Zooms in to place zones (zoom 15-18)
3. Zooms further to place individual plantings (zoom 19-21)
4. Grid automatically becomes more useful, measurements appear
5. Snap-to-grid helps place elements precisely
6. Spacing guides prevent overcrowding plantings

### Error Prevention

- Can't zoom past 21 (hard limit)
- Zoom controls disable at limits with visual feedback
- If user tries to zoom further, subtle shake animation on zoom control

---

## Error Handling & Edge Cases

### 1. Browser Compatibility
- **Issue:** Older browsers may not support high zoom levels smoothly
- **Solution:** Feature detection - check for requestAnimationFrame, CSS transform support
- **Fallback:** If unsupported, cap maxZoom at 18 and show notice: "High precision zoom requires a modern browser"

### 2. Tile Loading Failures at High Zoom
- **Issue:** Tiles might fail to load even at zoom 18
- **Solution:** Implement retry logic with exponential backoff
- **Fallback:** Show placeholder background color with warning icon
- **User message:** "Satellite imagery unavailable - drawing tools still work"

### 3. Performance Degradation
- **Issue:** Low-end devices struggle with many plantings + high zoom
- **Detection:** Monitor frame rate via `requestAnimationFrame` timing
- **Solution:** Auto-disable non-essential features:
  - Turn off spacing guides first
  - Reduce grid subdivision
  - Simplify zone rendering (fewer vertices)
- **User control:** Allow manual override in settings

### 4. Coordinate Precision Limits
- **Issue:** JavaScript floating-point precision limits at very high zoom
- **Solution:** Store coordinates as high-precision strings internally
- **Validation:** Round displayed measurements to realistic precision (0.1 ft / 1 cm)
- **Prevent:** Don't allow zooming if farm is at extreme latitudes (>85°) where Mercator projection breaks down

### 5. Grid Calculation Edge Cases
- **Issue:** Grid subdivision creates thousands of lines at zoom 21 on large farms
- **Solution:** Only generate grid for current viewport + 20% buffer
- **Update:** Regenerate grid when map moves/zooms (debounced 150ms)
- **Limit:** Cap grid lines at 500 per viewport (warn user to zoom in more)

### 6. Snap-to-Grid Conflicts
- **Issue:** Users can't place elements precisely where they want if snap is too aggressive
- **Solution:** Hold Shift key to temporarily disable snap
- **Visual:** Show cursor icon change when snap disabled
- **Setting:** Adjustable snap strength in settings (weak/medium/strong)

### 7. Memory Leaks
- **Issue:** Multiple zoom changes create event listeners and DOM elements
- **Solution:** Cleanup on component unmount:
  ```typescript
  useEffect(() => {
    // Setup listeners
    return () => {
      map.current?.off('zoom', handleZoomChange);
      // Remove measurement overlays
      // Clear grid cache
    };
  }, []);
  ```

### 8. Conflicting Map Styles
- **Issue:** Switching base layers (satellite → terrain) at high zoom
- **Solution:** Preserve zoom level and opacity settings across layer changes
- **Note:** Show warning if switching to layer with lower maxzoom

### 9. Offline/Slow Network
- **Issue:** Tiles won't load at all
- **Solution:** Cache last successful tile state
- **Indicator:** Show "offline mode" badge, keep vector layers functional
- **Graceful:** All drawing/measurement tools work without tiles

### 10. Touch Device Precision
- **Issue:** Fingers are less precise than mouse pointers
- **Solution:** Increase all touch targets at high zoom (2x larger)
- **Helper:** Show magnifying glass cursor indicator on long-press
- **Snap:** Make snap-to-grid more aggressive on touch devices

---

## Testing Approach

### Manual Testing Checklist

**1. Zoom level transitions:**
- [ ] Zoom smoothly from 1 to 21 using mouse wheel
- [ ] Zoom smoothly using pinch gesture on mobile/trackpad
- [ ] Verify satellite opacity fades correctly at each threshold (18, 19, 20, 21)
- [ ] Verify grid thickness increases proportionally
- [ ] Verify no visual "jumps" or glitches during zoom
- [ ] Test zoom controls (+/- buttons) work up to level 21

**2. Grid system:**
- [ ] Grid appears at zoom 13+ (current behavior)
- [ ] Grid subdivides correctly at zoom 20+
- [ ] Grid labels show correct dimensions (imperial/metric)
- [ ] Grid lines stay crisp (not blurry) at all zoom levels
- [ ] Grid regenerates correctly when panning map
- [ ] Grid respects user's unit preference toggle

**3. Snap-to-grid:**
- [ ] Snap activates at zoom 20+
- [ ] Visual indicators appear at grid intersections
- [ ] Cursor snaps to nearest intersection within radius
- [ ] Shift key disables snap temporarily
- [ ] Snap works for: drawing zones, placing plantings, editing vertices
- [ ] Snap strength adjustable in settings

**4. Measurement tools:**
- [ ] Distance measurements appear when drawing at zoom 19+
- [ ] Area measurements show on zone hover
- [ ] Spacing guides show mature plant spread
- [ ] Measurements update in real-time as you draw
- [ ] Measurements respect unit system (ft/m)
- [ ] Measurement overlay doesn't block interaction

**5. Performance testing:**
- [ ] Test on low-end device (< 4GB RAM)
- [ ] Monitor frame rate at zoom 21 with 50+ plantings
- [ ] Verify auto-disable features kick in if FPS drops below 30
- [ ] Test with large farm (5+ acres) at high zoom
- [ ] Verify grid generation doesn't freeze UI
- [ ] Test rapid zoom in/out repeatedly (no memory leaks)

**6. Cross-browser testing:**
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & iOS)
- [ ] Edge (desktop)
- [ ] Test on touch devices (iPad, Android tablet)

**7. Edge cases:**
- [ ] Switch base layers at zoom 21 (satellite → terrain)
- [ ] Draw boundary at zoom 21 then zoom out
- [ ] Place 100+ plantings then zoom to 21
- [ ] Test at extreme coordinates (near equator, near poles)
- [ ] Test with very small farm (< 100 sq ft)
- [ ] Test with very large farm (> 10 acres)
- [ ] Test offline mode (disconnect network)

**8. User experience validation:**
- [ ] First-time zoom toast appears correctly
- [ ] Keyboard shortcuts work (S, G, M)
- [ ] Help menu shows all shortcuts
- [ ] Map controls panel updates at zoom 19+
- [ ] Mobile pinch-to-zoom feels natural
- [ ] Touch targets are large enough on mobile

### Integration Testing

- Verify drawing tools (polygon, circle, point) work at all zoom levels
- Verify saving zones at high zoom preserves coordinates correctly
- Verify AI screenshot capture works at zoom 21
- Verify planting placement coordinates are accurate at high zoom
- Verify exported farm data includes accurate coordinate precision

### Acceptance Criteria

✅ Users can zoom to level 21 on small plots (100-500 sq ft)
✅ Satellite imagery fades gracefully to 30% opacity
✅ Grid becomes primary visual reference at high zoom
✅ Snap-to-grid provides precision placement within inches
✅ No performance issues on mid-range devices
✅ All existing features continue to work
✅ Mobile experience is smooth and usable

---

## Success Metrics

- **Precision:** Users can place plantings within 6 inches of intended location at zoom 21
- **Performance:** Frame rate stays above 30 FPS on devices with 4GB+ RAM
- **Adoption:** 40%+ of small farm users zoom beyond level 18
- **Satisfaction:** No complaints about disorientation or loss of spatial context
- **Mobile:** Touch placement accuracy within 10 inches at zoom 21

---

## Future Enhancements (Out of Scope)

- Photo overlay feature (upload site photos to replace satellite at high zoom)
- 3D rendering mode for visualizing vertical layers
- AR mode for on-site placement using phone camera
- Collaborative cursor tracking for real-time co-editing at high zoom
- Historical satellite imagery comparison at high zoom

---

**Design approved:** 2026-02-13
**Next step:** Create implementation plan via writing-plans skill
