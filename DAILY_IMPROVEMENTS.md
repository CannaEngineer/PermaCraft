# PermaCraft — 2026-05-29
## Focus: Map Core (Thursday)

### 1. Fix line click detection for API-sourced lines
File: `components/map/farm-map.tsx`
What changed: Added `design-lines` and all dashed line layers (irrigation, fence, flow_path, access_path, wildlife_corridor, terrace, drainage) to the click detection query layers, and updated the feature matching logic to recognize hits from these layers.
Map/dashboard impact: Previously, lines loaded from the database (i.e., any line after a page reload) were invisible to click/tap — users couldn't select, view details, or interact with persisted lines. Now all line types are selectable regardless of how they were rendered.

### 2. Fix stale variety data in planting submission
File: `components/map/farm-map.tsx`
What changed: Added `externalSelectedSpecies` to the dependency array of `handlePlantingSubmit` useCallback. The callback accesses `externalSelectedSpecies?.variety` but previously didn't list it as a dependency, meaning the variety could be stale if changed after initial species selection.
Map/dashboard impact: When a user selects a specific cultivar/variety for a species and then places it on the map, the correct variety is now guaranteed to be saved to the database.

### 3. Replace fragile setTimeout with requestAnimationFrame for zone layer restoration
File: `components/map/farm-map.tsx`
What changed: Replaced four instances of `setTimeout(..., 100/200)` with `requestAnimationFrame()` for adding colored zone layers after map initialization, zone data loading, and map style changes. The fixed timeouts were unreliable — if the map took longer to stabilize (slow device, complex style), zone colors could fail to appear.
Map/dashboard impact: Zone colors and grid overlays now appear reliably after map layer switches (satellite -> terrain -> topo, etc.) and after initial load, especially on slower devices or connections where 200ms wasn't enough.

## Watch for
- The `requestAnimationFrame` approach assumes MapboxDraw's `addControl` synchronously registers its sources within the same frame. If any browser environment defers this, zone layers could fail to attach. Monitor for "source not found" errors in the console after layer switches.
- The line click detection now queries up to 9 layers simultaneously; on farms with hundreds of line features, this could add marginal latency to click handling. Watch for perceptible delays on feature-dense maps.
- The `handlePlantingSubmit` dependency array change could cause more frequent callback recreation, but the planting form submit flow is infrequent enough that this has no performance impact.
