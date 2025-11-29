# Farm Boundaries, Measurement Grid, and Compass Design

**Date:** 2025-11-29
**Status:** Approved
**Author:** Claude Code

## Overview

Enhance the farm planning experience by adding three critical spatial context features:
1. Required farm boundary drawing during creation
2. Adaptive measurement grid overlay
3. Compass rose for orientation

These features provide essential spatial context for both users and the AI assistant.

## Problem Statement

Currently, farms are created by simply clicking a center point on the map. This provides insufficient context for:
- Understanding actual property boundaries
- Measuring distances and areas
- Planning layouts with proper orientation
- AI providing accurate spatial recommendations

## Goals

- Require users to define their actual property boundaries
- Provide visual measurement references (grid)
- Show cardinal directions for orientation planning
- Give AI better spatial context for recommendations

## Non-Goals

- Rotating map views (keeping north-up simplicity)
- Magnetic declination calculations (not needed for digital planning)
- Multiple grid systems simultaneously (one at a time via toggle)

---

## Feature 1: Farm Boundary During Creation

### User Flow

1. User navigates to `/farm/new`
2. Fills in basic farm details (name, description, acres)
3. Map loads with polygon drawing tool automatically activated
4. User clicks points around their property boundary
5. As they draw, live area calculation shows in acres/hectares
6. Double-click to close polygon
7. Boundary is validated and stored as special zone
8. Farm center point and zoom auto-calculated from boundary
9. "Create Farm" button enables

### Data Model

Store boundary in `zones` table:
```typescript
{
  zone_type: 'farm_boundary',
  geometry: '{"type":"Polygon","coordinates":[[[lng,lat]...]]}',
  properties: JSON.stringify({
    name: 'Farm Boundary',
    area_acres: 5.2,
    area_hectares: 2.1
  })
}
```

### Validation Rules

- Boundary must be a valid closed polygon (minimum 3 points)
- Polygon cannot self-intersect
- Area must be > 0.1 acres (prevent accidental tiny polygons)
- Only one `farm_boundary` zone per farm

### UI Components

**New Component: `BoundaryDrawer`**
- Extends LocationPicker with polygon drawing
- Shows live area calculation
- Visual feedback when polygon is valid/invalid
- Help text: "Draw your farm boundary by clicking points around your property. Double-click to finish."

**Modified: `/farm/new` page**
- Replace LocationPicker with BoundaryDrawer
- Disable "Create Farm" until valid boundary drawn
- Show calculated area vs. entered acres (warning if mismatch > 20%)

### API Changes

**POST `/api/farms`**
- Accept `boundary_geometry` in request body
- Create farm record
- Immediately create `farm_boundary` zone
- Calculate center_lat, center_lng from polygon centroid
- Calculate zoom_level to fit boundary in viewport

### Edge Cases

- User enters 10 acres but draws 1 acre: Show warning, allow override
- Very complex polygon (100+ points): Show performance warning
- Boundary crosses international date line: Not supported (edge case)

---

## Feature 2: Measurement Grid Overlay

### Grid Behavior

Grid lines dynamically adjust based on zoom level:

**Imperial Intervals (default):**
- Zoom 10-12: 1000ft intervals
- Zoom 13-14: 500ft intervals
- Zoom 15-16: 250ft intervals
- Zoom 17-18: 100ft intervals
- Zoom 19+: 50ft intervals

**Metric Intervals:**
- Zoom 10-12: 500m intervals
- Zoom 13-14: 250m intervals
- Zoom 15-16: 100m intervals
- Zoom 17-18: 50m intervals
- Zoom 19+: 25m intervals

### Visual Design

- Semi-transparent white lines (0.2 opacity) on satellite
- Semi-transparent black lines (0.2 opacity) on street/terrain
- Line width: 1px
- Labels at major grid intersections
- Label format: "250 ft" or "100 m"
- Labels fade out when too dense (zoom level check)

### UI Controls

**Grid Toggle Button:**
- Position: Top-right corner, below layer selector
- Text: "Feet ⟷ Meters" or "ft ⟷ m"
- Saves preference to localStorage
- Grid always visible (cannot be disabled)

### Implementation Details

**MapLibre Layers:**
```typescript
// Grid lines layer
{
  id: 'measurement-grid',
  type: 'line',
  source: 'grid-source',
  paint: {
    'line-color': '#ffffff',
    'line-width': 1,
    'line-opacity': 0.2
  }
}

// Grid labels layer
{
  id: 'measurement-grid-labels',
  type: 'symbol',
  source: 'grid-source',
  layout: {
    'text-field': ['get', 'label'],
    'text-size': 10,
    'text-font': ['Open Sans Regular']
  }
}
```

**Grid Calculation:**
1. Get current map bounds
2. Calculate appropriate interval based on zoom
3. Generate GeoJSON LineStrings for grid
4. Add label points at intersections
5. Update source data

### Performance

- Regenerate grid only on zoom/pan end (debounced)
- Limit to viewport + 20% buffer
- Maximum 50 grid lines per direction
- Use GeoJSON source for efficient updates

---

## Feature 3: Compass Indicator

### Visual Design

Simple compass rose showing cardinal directions:
- 60px diameter circle
- Semi-transparent white background (0.8 opacity)
- Black border (1px)
- Large "N" at top (bold, 16px)
- Smaller "S", "E", "W" (12px) at other positions
- North arrow pointing up (red triangle)

### Placement

- Bottom-left corner of map
- 20px margin from edges
- Above any MapLibre attribution
- z-index ensures it's always visible

### Implementation

**Static SVG Component:**
```jsx
<div className="absolute bottom-4 left-4 z-10">
  <svg width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="28" fill="white" fillOpacity="0.8" stroke="black" strokeWidth="1"/>
    <polygon points="30,10 26,22 34,22" fill="#dc2626"/> {/* North arrow */}
    <text x="30" y="15" textAnchor="middle" fontSize="16" fontWeight="bold">N</text>
    <text x="30" y="52" textAnchor="middle" fontSize="12">S</text>
    <text x="10" y="35" textAnchor="middle" fontSize="12">W</text>
    <text x="50" y="35" textAnchor="middle" fontSize="12">E</text>
  </svg>
</div>
```

**Reusable Component: `CompassRose`**
- Self-contained, no props needed
- Shows on all map views
- No interaction required

---

## AI Context Improvements

With these features, the AI will receive:

**Farm Boundary Context:**
```json
{
  "farm_boundary": {
    "area_acres": 5.2,
    "perimeter_feet": 1850,
    "geometry": {...}
  }
}
```

**Measurement Context:**
- Grid spacing visible in screenshots
- AI can reference distances: "Plant windbreak 100ft from north boundary"

**Orientation Context:**
- Compass visible in screenshots
- AI understands cardinal directions: "South-facing slope ideal for..."

---

## Implementation Order

1. **Farm Boundary** (highest priority)
   - Modify farm creation flow
   - Update database schemas
   - Add boundary validation

2. **Compass Rose** (easiest, quick win)
   - Create SVG component
   - Add to map views

3. **Measurement Grid** (most complex)
   - Implement grid calculation logic
   - Add MapLibre layers
   - Create toggle UI
   - Handle zoom-based scaling

---

## Testing Considerations

**Farm Boundary:**
- Create farm with simple rectangle
- Create farm with complex irregular shape
- Try to create invalid polygon (self-intersecting)
- Verify area calculations match expectations

**Measurement Grid:**
- Zoom in/out, verify grid scales appropriately
- Toggle between imperial/metric
- Check performance with rapid panning
- Verify labels don't overlap at high zoom

**Compass:**
- Verify visible on all map layers
- Check placement doesn't obscure controls
- Ensure readability on different backgrounds

---

## Future Enhancements (Not in Scope)

- Boundary editing after creation
- Multiple boundary polygons (for non-contiguous properties)
- Custom grid intervals
- Magnetic declination display
- Distance measurement tool
- Area calculation tool for arbitrary polygons

---

## Success Metrics

- 100% of farms have defined boundaries
- Grid provides clear spatial reference in screenshots
- AI references directions and distances accurately
- Users report better spatial understanding in feedback
