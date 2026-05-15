# PermaCraft — 2026-05-15
## Focus: Map Core (Thursday)

### 1. Fire onDrawComplete callback after zone creation
File: `components/map/farm-map.tsx`
What changed: The `onDrawComplete` prop was declared and destructured but never called. Added a ref-based invocation at the end of `handleDrawCreate` so the parent (unified canvas) is notified when a zone/point drawing finishes.
Map/dashboard impact: In the unified canvas flow, drawing mode now exits automatically after completing a zone. Previously, the canvas stayed stuck in drawing mode and users had to manually toggle it off.

### 2. Replace blocking alert() with toast notifications for save feedback
File: `app/(app)/farm/[id]/farm-editor-client.tsx`
What changed: Replaced `alert("Zones saved successfully!")` and `alert("Failed to save zones")` with non-blocking `toast()` calls. Added `useToast` import.
Map/dashboard impact: Saving zones no longer freezes the map with a modal dialog. Designers get a subtle toast notification that doesn't interrupt their workflow. The destructive variant is used for errors so they stand out.

### 3. Reorder custom layers after imagery loads on layer switch
File: `components/map/farm-map.tsx`
What changed: Added `ensureCustomLayersOnTop()` call after custom imagery layers load in `loadCustomImagery`. Previously, when switching map layers, imagery raster overlays could end up painted above the colored zone fills and grid lines because `addColoredZoneLayers` ran before imagery finished loading.
Map/dashboard impact: Zone coloring and grid labels are always visible above any custom imagery overlays, regardless of when imagery finishes loading during a map layer switch.

### 4. Update planting marker position when coordinates change
File: `components/map/planting-marker.tsx`
What changed: Added a useEffect that watches `planting.lng` and `planting.lat` and calls `marker.setLngLat()` when they change. The marker was only positioned once at creation time.
Map/dashboard impact: When optimistic planting updates are replaced by server responses (which may have slightly adjusted coordinates), markers now move to the correct position instead of staying at the original click location.

## Watch for
- The `onDrawComplete` callback fires for every non-boundary, non-line feature creation. The immersive editor intentionally ignores it (`() => {}`) to stay in drawing mode until the user clicks Done. The unified canvas uses it to exit drawing mode. If a new consumer needs different behavior, they should handle it in their callback.
- The `ensureCustomLayersOnTop` call is now also in `loadCustomImagery`'s dependency array. If imagery load is called frequently, the layer reordering runs each time — but `moveLayer` is a no-op if the layer is already topmost, so performance impact is negligible.
- Planting marker position sync only fires when the `planting.lng`/`planting.lat` values actually change (React dependency check). Normal renders (zoom, year changes) don't trigger unnecessary setLngLat calls.
