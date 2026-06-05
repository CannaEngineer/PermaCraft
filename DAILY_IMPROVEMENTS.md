# PermaCraft -- 2026-06-05
## Focus: Map Core (Thursday)

### 1. Fix circle tool in immersive editor drawing polygons instead of circles
File: `components/map/farm-map.tsx`
What changed: The external draw tool handler now properly activates `circleMode` state when `externalDrawTool === 'circle'`, routing clicks to the two-click center→edge circle creation flow instead of entering MapboxDraw's polygon mode.
Map/dashboard impact: Users clicking the "Circle" button in the immersive editor now actually draw circles. Previously they got regular polygons, defeating the purpose of the tool.

### 2. Snap circle zone vertices to grid at zoom 20+
File: `components/map/farm-map.tsx`
What changed: Circle polygon vertices are now run through `snapCoordinate` before being added to the draw store. Circles were previously the only geometry type that bypassed the snap-to-grid system because they don't go through the `draw.create` event handler.
Map/dashboard impact: At precision zoom levels (20+), circles snap to grid intersections like all other geometry, maintaining consistent alignment across the design.

### 3. Add MultiPolygon and MultiLineString support to farm bounds calculation
File: `components/map/farm-map.tsx`
What changed: `getFarmBounds()` now iterates MultiPolygon and MultiLineString coordinates when computing the bounding box used for grid placement. Previously these geometry types were silently skipped.
Map/dashboard impact: Farms with MultiPolygon zones (valid per the API schema) now get correct grid positioning instead of falling back to the viewport bounds.

### 4. Increase grid viewport clipping buffer to prevent flicker during fast pans
File: `lib/map/measurement-grid.ts`
What changed: Grid line clipping buffer around the viewport increased from 1× to 3× grid step. This pre-generates lines beyond the visible edge so they're already rendered when the viewport moves.
Map/dashboard impact: Grid lines no longer visibly pop in at the screen edges during fast map pans. The grid feels stable and anchored.

## Watch for
- Circle mode state cleanup: if the user switches from circle tool to another tool and back rapidly, verify `circleCenter` resets correctly (the code clears it on tool change, but rapid switching could theoretically race).
- MultiPolygon in farm boundary: `getFarmBounds` only handles `Polygon` type for the farm boundary specifically (line 2926). If someone ever creates a MultiPolygon farm boundary, it would fall through to the general bounds calculation, which now handles it — but the farm boundary code path itself doesn't. Low risk since farm boundaries are always simple polygons.
- Grid buffer performance: the 3× buffer generates more grid lines per frame. For very large farms at low zoom, this could increase line count. The existing 250-line cap per axis prevents runaway generation.
