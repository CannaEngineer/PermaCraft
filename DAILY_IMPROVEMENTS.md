# PermaCraft — 2026-05-12
## Focus: Map Core (Monday)

### 1. Fix snap-to-grid ignoring user toggles during drawing
File: `components/map/farm-map.tsx`
What changed: The `snapFeatures` function was defined inside the mount-once useEffect, capturing `snapToGridEnabled`, `gridUnit`, and `gridSubdivision` as closure values from the initial render. Pressing `S` to toggle snap, changing grid units (imperial/metric), or zoom-triggered fine grid subdivision had no effect on actual snap behavior. Replaced all three with refs (`snapToGridEnabledRef`, `gridUnitRef`, `gridSubdivisionRef`) so the function always reads current values.
Map/dashboard impact: Designers can now reliably toggle snap-to-grid with `S` and see it take effect immediately. Switching between imperial and metric grid units also correctly changes the snap grid spacing. Previously, snap was permanently locked to the initial settings.

### 2. Fix stale grid regeneration after draw operations
File: `components/map/farm-map.tsx`
What changed: The `handleDrawChange`, `handleDrawChangeDragging`, and `moveend` handlers all called `updateGrid()` via a stale closure reference captured at mount. After the user changed grid unit, density, or subdivision, draw operations and map pans would regenerate the grid with the original settings. Replaced direct `updateGrid()` calls with `updateGridRef.current?.()` which always points to the latest useCallback instance.
Map/dashboard impact: After changing grid units from feet to meters (or adjusting density), drawing a new zone or panning the map now correctly regenerates the grid with the updated settings instead of reverting to imperial/default.

### 3. Fix water flow animation stopping after layer switch
File: `components/map/farm-map.tsx`
What changed: The flow arrow animation useEffect had empty `[]` dependencies, so it started once at mount and never restarted. When `changeMapLayer()` destroys and recreates the `line-arrows` layer, the old animation stops (layer gone) but no new animation starts. Added `mapLayer` as a dependency so the effect restarts after every layer switch.
Map/dashboard impact: Water flow arrows (streams, swales) now continue animating after switching between satellite, terrain, topo, and street base layers. Previously, arrows froze after the first layer switch.

### 4. Fix dimension labels rendering under other layers
File: `components/map/farm-map.tsx`
What changed: `ensureCustomLayersOnTop` was missing `grid-dimension-labels-layer` from its layer ordering list. At zoom 20+, dimension labels (e.g., "10ft × 10ft") could render underneath zone fills or line features instead of on top.
Map/dashboard impact: Dimension labels at precision zoom levels (20+) are now always visible on top of all other design elements.

## Watch for
- The snap ref pattern is consistent with how `zoneTypeRef` was already used for zone type in draw handlers. If any other state is read inside the mount-once useEffect and expected to stay current, it should be converted to a ref.
- The `moveend` handler is now an anonymous arrow wrapping `updateGridRef.current?.()`. This means it can't be removed by reference in the cleanup. Since the map instance is destroyed on unmount anyway, this is fine, but if cleanup requirements change, the handler should be stored in a ref.
- Animation restart uses a 600ms delay (increased from 500ms) to account for the layer recreation happening inside a `setTimeout(() => addColoredZoneLayers(), 200)` call. If layer setup timing changes, the animation delay may need adjustment.
