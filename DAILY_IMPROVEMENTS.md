# PermaCraft — 2026-06-18
## Focus: Map Core (Thursday)

### 1. Farm boundary protection survives layer switching
File: `components/map/farm-map.tsx`
What changed: Promoted `farmBoundaryCache` from a local variable inside the mount effect closure to a `useRef`, and repopulate it after `setStyle()` recovery restores features from `savedFeaturesRef`.
Map/dashboard impact: Previously, switching from satellite to terrain (or any layer change) destroyed the farm boundary cache. If the user then accidentally dragged a farm boundary vertex, it would move permanently — the protection that restores it to its original position silently failed because the cache was empty. Now boundary protection persists across all layer switches.

### 2. Race condition guard for rapid layer switching
File: `components/map/farm-map.tsx`
What changed: Added a generation counter (`styleChangeGenRef`) that increments on each `changeMapLayer` call. The `styledata` and `idle` recovery callbacks check the counter and bail out if a newer style change has been initiated, preventing concurrent recovery attempts from fighting over `draw.current`.
Map/dashboard impact: Rapidly clicking through layer options (satellite → terrain → street → USGS) no longer risks duplicate MapboxDraw instances, lost feature state, or orphaned event handlers from stale recovery callbacks.

### 3. Unsaved changes warning on page close
Files: `components/immersive-map/immersive-map-editor.tsx`, `app/(app)/farm/[id]/farm-editor-client.tsx`
What changed: Added `beforeunload` event listeners that fire when `hasUnsavedChanges` is true. Both the immersive and classic editors now prompt the browser's native "Leave site?" dialog.
Map/dashboard impact: The auto-save timer fires after 2 seconds of inactivity, but if a user draws a zone and immediately closes the tab (or navigates away), those changes were silently lost. Now the browser warns them before discarding unsaved work.

### 4. Line update API: farm ownership verification
File: `app/api/farms/[id]/lines/[lineId]/route.ts`
What changed: Added farm ownership check (`WHERE user_id = ?`) before allowing PATCH updates, and scoped the UPDATE/SELECT queries by `farm_id`. Previously, the PATCH endpoint accepted any `lineId` without verifying the caller owned the farm — a direct API call could modify lines on any farm.
Map/dashboard impact: Prevents unauthorized modification of line features (swales, fences, flow paths) on farms the user doesn't own. The DELETE endpoint already had this check; PATCH was missing it.

## Watch for
- Farm boundary cache uses feature IDs as keys. If MapboxDraw ever reassigns IDs during `set()` (unlikely but undocumented), the cache would have stale keys. Monitor for boundary protection failures after layer switches.
- The `beforeunload` handler doesn't attempt a synchronous save — it only warns. A future improvement could flush the pending auto-save synchronously via `navigator.sendBeacon`.
- The generation counter prevents stale recovery but doesn't cancel in-flight async work (like `loadImage` for arrow icons). If the icon load from a stale generation completes after a new generation's recovery, it's harmless (guarded by `hasImage` check) but wastes a network request.
