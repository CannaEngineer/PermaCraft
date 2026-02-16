# Mapping Features - Permaculture.Studio

**Last Updated:** 2026-02-13
**Status:** Current Production Features

This document catalogs all mapping features available in Permaculture.Studio, organized by category.

---

## Table of Contents

1. [Map Implementations](#map-implementations)
2. [Base Map Layers](#base-map-layers)
3. [Drawing & Zone Tools](#drawing--zone-tools)
4. [Enhanced Zoom System](#enhanced-zoom-system)
5. [Measurement & Grid System](#measurement--grid-system)
6. [Planting System](#planting-system)
7. [Time Machine](#time-machine)
8. [Navigation & Controls](#navigation--controls)
9. [Visual Enhancements](#visual-enhancements)
10. [Mobile Optimizations](#mobile-optimizations)
11. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Map Implementations

### Classic Editor (`FarmEditorClient`)
- Original implementation with sidebar-based UI
- Map viewport alongside control panels
- Full feature set with traditional desktop layout

### Immersive Editor (`ImmersiveMapEditor`)
- Full-screen, map-first experience (100vh viewport)
- Auto-collapsing UI overlays
- Glassmorphism design with backdrop blur
- Context-aware interface (shows relevant controls only)
- Feature flag: `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR`

**Key Components:**
- `CollapsibleHeader` - Auto-hiding farm metadata bar
- `MapControlPanel` - Top-right settings panel
- `DrawingToolbar` - Contextual drawing tools (right side)
- `BottomDrawer` - Slide-up details drawer
- `ChatOverlay` - AI chat interface

---

## Base Map Layers

### Available Map Styles

| Layer | Source | Max Zoom | API Key Required | Notes |
|-------|--------|----------|------------------|-------|
| **Satellite** | ESRI ArcGIS Online | 18 | No | Default layer, high-quality satellite imagery |
| **Mapbox Satellite** | Mapbox | 18 | Yes (optional) | Premium satellite tiles, requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` |
| **3D Terrain** | ESRI + Mapbox/MapLibre DEM | 18 | Partial | Satellite with 3D elevation, 1.5x exaggeration for slope analysis |
| **Terrain** | ESRI World Terrain | 18 | No | Physical terrain basemap |
| **Topo** | OpenTopoMap | 18 | No | Topographic map with contours |
| **USGS Topo** | USGS National Map | 18 | No | Official USGS topographic maps |
| **Street** | OpenFreeMap (OSM Liberty) | 18 | No | Street map with labels |

### Layer Features
- **Seamless switching**: Change layers without losing user-drawn features
- **Satellite opacity fade**: Progressive fade at zoom 18+ (100% → 85% opacity at z21)
- **3D terrain controls**: Pitch and bearing controls when 3D terrain enabled
- **Tile caching**: 15-minute self-cleaning cache for faster responses

---

## Drawing & Zone Tools

### Drawing Modes

**Polygon Drawing:**
- Standard polygons for zones and areas
- Click to add vertices, double-click to finish
- Edit mode: Drag vertices and edges to reshape
- Delete mode: Remove unwanted features

**Circle Drawing:**
- Click to set center point
- Click again to set radius
- Converts to GeoJSON polygon for storage
- Visual center marker during drawing

**Point Placement:**
- Single-click planting placement
- Species-aware cursor
- Optimistic UI updates (instant feedback)

### Zone Types (20 Categories)

**Permaculture Zones:**
- Zone 0 (House) - Red
- Zone 1 (Kitchen Garden) - Green
- Zone 2 (Orchard) - Lime
- Zone 3 (Main Crops) - Yellow
- Zone 4 (Pasture/Woodland) - Orange
- Zone 5 (Wilderness) - Gray

**Water Features:**
- Water Body (Pond/Lake) - Sky blue, 30% opacity
- Water Flow (Stream) - Cyan, 30% opacity
- Swale - Light blue, 15% opacity
- Pond - Sky blue, 30% opacity

**Structures & Infrastructure:**
- Structure (Building) - Red, 30% opacity
- Path/Road - Slate gray, 30% opacity
- Fence - Gray, 10% opacity

**Agroforestry Systems:**
- Food Forest - Green, 25% opacity
- Silvopasture - Lime, 20% opacity
- Alley Cropping - Yellow-green, 20% opacity
- Windbreak - Dark green, 20% opacity

**Agricultural Areas:**
- Annual Garden - Yellow, 20% opacity
- Orchard - Orange, 20% opacity
- Pasture - Lime, 20% opacity
- Woodland - Green, 20% opacity

**Other:**
- Other - Gray, 15% opacity

### Zone Features
- **Color-coded**: Each zone type has distinct fill/stroke colors
- **MapLibre expressions**: Dynamic styling based on `user_zone_type` property
- **Quick labeling**: Right-click context menu for instant zone naming
- **Boundary detection**: Farm boundary auto-detected and styled (purple, transparent fill)
- **Layer ordering**: Custom layers always on top of base map

---

## Enhanced Zoom System

### Zoom Levels & Progressive Enhancements

**Zoom Range:** 1-21 (21 levels)

**Zoom Thresholds:**
- **Zoom 1-18:** Standard mode (satellite + design layers)
- **Zoom 18+:** Precision mode begins
- **Zoom 19+:** Design mode emphasized (satellite fades, grid thickens)
- **Zoom 20+:** Fine grid subdivision (50ft → 10ft, 25m → 5m)
- **Zoom 21:** Maximum precision (satellite 85% opacity, thickest grid)

### Visual Progression

**Satellite Opacity:**
```
z18: 100% → z19: 95% → z20: 90% → z21: 85% (minimum)
```

**Grid Thickness:**
```
z18: 1px → z19: 1.5px → z20: 2px → z21: 2.5px
```

**Zone Boundary Thickness:**
```
z18: 2px → z19: 3px → z20: 4px → z21: 5px
```

**Label Size:**
```
z18: 1.0x → z19: 1.1x → z20: 1.2x (capped)
```

**Planting Marker Size:**
```
z18-19: 1.0x → z20: 1.25x → z21: 1.5x
```

### Fine Grid Subdivision (Zoom 20+)

**Grid Spacing:**
- **Coarse grid** (z18-19): 50ft or 25m
- **Fine grid** (z20-21): 10ft or 5m

**Dimension Labels:**
- Shows cell dimensions (e.g., "10ft × 10ft") at grid intersections
- Only visible at zoom 20+
- Displayed every 4th intersection to avoid clutter

### Purpose
- **Urban/small plot precision**: Enables detailed planning for backyard gardens and small urban farms
- **Satellite tile limitation**: Tiles stop loading beyond zoom 18 (provider max), progressive enhancements compensate
- **Visual clarity**: Design elements become more prominent as user zooms into precision work

---

## Measurement & Grid System

### Grid Types

**Fixed Reference Grid:**
- Geographic location fixed (doesn't move with zoom)
- Consistent grid origin (based on farm bounds)
- Alphanumeric labels: Columns (A-Z), Rows (1-∞)
- AI-consistent: Grid coordinates stay the same at all zoom levels

**Adaptive Density Grid:**
- Visual density adjusts to zoom level
- Label skip intervals prevent clutter
- Grid regeneration debounced (150ms) for performance

### Grid Settings

**Units:**
- Imperial (feet)
- Metric (meters)

**Density Modes:**
- **Auto:** Adapts to zoom level
  - z<14: 200ft / 100m (very sparse)
  - z14-16: 100ft / 50m (moderate)
  - z17-19: 50ft / 25m (detailed)
  - z20+: 10ft / 5m (ultra-detailed, fine subdivision)
- **Sparse:** 200ft / 100m fixed
- **Normal:** 100ft / 50m fixed
- **Dense:** 50ft / 25m fixed
- **Off:** No grid displayed

### Grid Features
- **Coarse/fine subdivision**: Automatic subdivision at zoom 20+
- **Viewport labels**: Only show labels for visible grid cells
- **Label thinning**: Progressively show fewer labels when zoomed out
- **Grid alignment**: Fine grid aligns with coarse grid (every 5th line matches)

### Measurement Overlay
- SVG overlay for measurements (future expansion)
- Distance calculations using Haversine formula
- Area calculations in acres/hectares
- Spacing guides for plantings (planned)

---

## Planting System

### Planting Workflow

1. **Species Selection:**
   - Compact picker (default) or full panel
   - Filter by layer (canopy, understory, shrub, herbaceous, etc.)
   - Native species indicator
   - Search by common/scientific name

2. **Placement:**
   - Click map to place planting
   - Snap-to-grid at zoom 20+ (optional)
   - Visual species cursor

3. **Details Form:**
   - Custom name (optional)
   - Planted year (defaults to current)
   - Zone assignment (optional)
   - Notes field

4. **Optimistic Updates:**
   - Instant visual feedback
   - Temporary ID during save
   - Server sync in background

### Planting Features

**Visual Rendering:**
- Canopy circle based on mature width
- Color-coded by species layer
- Size scales with time machine year
- Growth simulation using sigmoid curve
- Marker size increases at zoom 20+ (1.25x-1.5x)

**Filtering:**
- Filter by species layer (canopy, shrub, etc.)
- Filter by vitals (nitrogen fixer, edible, medicinal, etc.)
- Guild companion filtering (show compatible plantings)

**Details Popup:**
- Species information
- Planting metadata (year, zone, notes)
- Edit/delete actions
- Growth progress indicator

### Species Database
- Community-contributed species library
- Scientific and common names
- Native region data
- Layer classification
- Mature dimensions (height/width)
- Years to maturity
- Vital attributes (edible, medicinal, nitrogen fixer, etc.)

---

## Time Machine

### Growth Simulation

**Timeline Controls:**
- Year slider (current year to +20 years)
- Play/pause animation
- Playback speed (0.5x, 1x, 2x, 5x)
- Reset to current year

**Keyboard Shortcuts:**
- **Arrow Left/Right:** Step year backward/forward
- **Space:** Toggle play/pause
- **Home:** Jump to current year
- **End:** Jump to max year (+20)

**Visual Effects:**
- Planting canopy size scales based on years from planted_year
- Sigmoid growth curve (slow → fast → slow)
- Mature size reached at `years_to_maturity`
- Smooth transitions between years

**Use Cases:**
- Visualize farm maturity over time
- Plan spacing based on future growth
- Identify overcrowding issues
- Demonstrate design evolution to clients/community

---

## Navigation & Controls

### Map Controls

**Navigation Control:**
- Zoom in/out buttons
- Compass reset button
- Standard MapLibre GL JS control

**Compass Rose:**
- Always points north
- Rotates with map bearing
- Bottom-left corner overlay
- Drop shadow for visibility

**FAB Menu (Immersive Mode):**
- Floating action button
- Access to map settings, grid, layers
- Context-aware (shows relevant actions)

### Camera Controls

**Standard Navigation:**
- Pan (drag)
- Zoom (scroll wheel, pinch)
- Rotate (Ctrl+drag, two-finger rotate)
- Pitch (Ctrl+drag up/down)

**3D Terrain Mode:**
- Pitch slider (0-60°)
- Bearing slider (0-360°)
- Exaggeration: 1.5x for permaculture slope analysis

**Limits:**
- Max zoom: 21 (enhanced precision)
- Min zoom: 1 (global view)
- Satellite tiles frozen beyond zoom 18 (provider limitation)

---

## Snap-to-Grid

### Automatic Snap

**Activation:**
- Enabled by default at zoom 20+
- Magnetic snap to nearest grid intersection
- Snap radius: 5px @ z20 → 10px @ z21
- Touch devices: 2x snap radius (10px-20px)

**Toggle:**
- Press **`S`** key to toggle on/off
- Toast confirmation shows status
- Temporary disable: Hold **Shift** while drawing

**Visual Feedback:**
- Coordinates "snap" when within radius
- Smooth transition to grid point
- Works with polygon vertices and planting placement

---

## Visual Enhancements

### Glassmorphism UI (Immersive Mode)
- Backdrop blur effects (`backdrop-blur-xl`, `backdrop-blur-lg`)
- Semi-transparent backgrounds (`bg-background/70`, `bg-background/80`)
- Border with transparency (`border border-border/30`)
- Shadow effects (`shadow-glass`, `shadow-2xl`)
- Theme-aware: Adapts to light/dark mode

### Layer Styling

**Zone Rendering:**
- Fill color from `ZONE_TYPES` config
- Fill opacity varies by type (10%-30%)
- Stroke color darker than fill
- Stroke width 2-5px (increases at zoom 20+)
- MapLibre expressions for dynamic styling

**Grid Styling:**
- Yellow lines (`#ffff00`) for visibility on satellite
- Opacity: 20%-40% depending on zoom
- Thickens progressively at zoom 18+
- Labels with halo for contrast

**Planting Markers:**
- Circular canopy representation
- Layer-based colors (green hues)
- Opacity based on maturity
- Scales with zoom and time

### Auto-Collapse UI (Immersive Mode)

**Header Collapse:**
- Auto-collapses on first map interaction (pan, zoom, draw)
- Expands on hover (top 60px of viewport)
- Manual toggle available
- Smooth 300ms ease-out-expo transition

**Bottom Drawer:**
- Slide-up from bottom edge
- Drag handle for easy dismissal
- Tab-based navigation (zones, plantings, filters)
- Swipe gestures on mobile

---

## Mobile Optimizations

### Touch Interactions

**Gestures:**
- Single tap: Select feature or place planting
- Two-finger drag: Pan map
- Pinch: Zoom in/out
- Two-finger rotate: Rotate map
- Swipe down (top edge): Expand header
- Swipe up (bottom): Open drawer
- Long press: Context menu (zone labeling)

**Touch Targets:**
- Minimum 44x44px (Apple HIG)
- Larger snap-to-grid radius (2x)
- Bottom-zone buttons (thumb-friendly)
- FAB menu for primary actions

### Mobile UI Adaptations

**Immersive Mode:**
- Header: 56px (single row)
- Map control panel: FAB → Bottom sheet
- Drawing toolbar: Bottom bar
- Compact species picker by default

**Responsive Breakpoints:**
- Mobile: `< 768px` (md breakpoint)
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

### Performance

**Optimizations:**
- Lazy load MapLibre (large bundle)
- React Server Components for initial load
- Debounced grid regeneration (150ms)
- Optimistic UI updates for plantings
- Cached tile requests (15-minute cache)

---

## Keyboard Shortcuts

### Drawing & Editing

| Key | Action |
|-----|--------|
| **S** | Toggle snap-to-grid on/off |
| **Shift** (hold) | Temporarily disable snap while drawing |
| **H** | Show help menu with all shortcuts |
| **Esc** | Exit current drawing mode |

### Time Machine

| Key | Action |
|-----|--------|
| **Arrow Left** | Step year backward |
| **Arrow Right** | Step year forward |
| **Space** | Toggle play/pause animation |
| **Home** | Jump to current year |
| **End** | Jump to max year (+20) |

### Navigation

| Key | Action |
|-----|--------|
| **+** / **=** | Zoom in |
| **-** | Zoom out |
| **Ctrl + Drag** | Rotate map (change bearing) |
| **Ctrl + Drag Up/Down** | Pitch map (3D terrain mode) |

---

## Implementation Files

### Core Map Components
- `components/map/farm-map.tsx` - Main map editor (31k+ tokens)
- `components/map/farm-map-readonly.tsx` - Read-only map view
- `components/immersive-map/immersive-map-editor.tsx` - Immersive mode wrapper

### Drawing & Zones
- `components/map/boundary-drawer.tsx` - Farm boundary creation
- `lib/map/circle-helper.ts` - Circle polygon generation
- `lib/map/zone-types.ts` - Zone type definitions and styling

### Grid & Measurements
- `lib/map/measurement-grid.ts` - Grid generation logic
- `lib/map/snap-to-grid.ts` - Snap calculations
- `lib/map/zoom-enhancements.ts` - Zoom enhancement utilities
- `components/map/measurement-overlay.tsx` - SVG measurement layer

### Plantings
- `components/map/planting-marker.tsx` - Individual planting rendering
- `components/map/species-picker-panel.tsx` - Full species picker
- `components/map/species-picker-compact.tsx` - Compact species picker
- `components/map/planting-form.tsx` - Planting details form
- `components/map/planting-detail-popup.tsx` - Planting info popup

### Navigation & UI
- `components/map/compass-rose.tsx` - North indicator
- `components/map/timeline-slider.tsx` - Time machine control
- `components/map/map-controls-sheet.tsx` - Settings panel
- `components/map/map-legend.tsx` - Zone type legend

### Immersive Mode Components
- `components/immersive-map/collapsible-header.tsx` - Auto-hiding header
- `components/immersive-map/map-control-panel.tsx` - Settings panel
- `components/immersive-map/drawing-toolbar.tsx` - Drawing tools
- `components/immersive-map/bottom-drawer.tsx` - Slide-up drawer
- `components/immersive-map/chat-overlay.tsx` - AI chat interface

### Context & State
- `contexts/immersive-map-ui-context.tsx` - Centralized UI state (immersive mode)

---

## Known Limitations

### Technical Constraints

1. **Satellite Tile Zoom:**
   - Tiles stop loading beyond zoom 18 (provider limitation)
   - Tiles are frozen/reused at higher zooms
   - Progressive enhancements compensate visually

2. **Grid Performance:**
   - Maximum 250 lines per direction (prevents lag)
   - Debounced regeneration (150ms)
   - Minimum zoom 13 for grid display

3. **Browser Compatibility:**
   - MapLibre GL JS requires WebGL support
   - 3D terrain requires WebGL 2 (modern browsers only)

4. **Mobile Performance:**
   - Large farms (>100 zones) may experience slowdown
   - Fine grid at low zoom can cause frame drops
   - Consider disabling grid on slower devices

### Future Enhancements

- **Measurement tools:** Distance and area measurement during drawing
- **Terrain analysis:** Slope, aspect, and elevation data integration
- **Soil data:** SSURGO soil type overlay
- **Real-time collaboration:** WebSocket-based multi-user editing
- **Offline mode:** Service worker caching for field use
- **Export formats:** KML, GeoJSON, shapefile export

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [Immersive Map Design Plan](./plans/2026-02-12-immersive-map-design.md) - Immersive mode specifications
- MapLibre GL JS Docs: https://maplibre.org/maplibre-gl-js/docs/
- OpenRouter AI Integration: https://openrouter.ai/docs

---

*Last updated: 2026-02-13*
*Maintained by: Claude Code*
