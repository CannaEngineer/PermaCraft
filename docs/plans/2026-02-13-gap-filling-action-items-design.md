# Gap-Filling Action Items: Professional Design Tools
## Comprehensive Implementation Design

**Date:** February 13, 2026
**Purpose:** Detailed design for implementing all features identified in Design_Doc_PRO_TOOLS.md
**Strategy:** Parallel Development Tracks for maximum flexibility and independent implementation
**Scope:** All 10 features (Rich Annotations → Offline Field Mode) + enhancements to existing features

---

## Executive Summary

This document provides detailed implementation specifications for transforming Permaculture.Studio from a mapping tool into a professional permaculture design platform. The 10 features are organized into 4 parallel development tracks, each deliverable independently while integrating seamlessly with the others.

### Current State
✅ **Shipped:** 7 base map layers, 20 zone types, polygon/circle/point drawing, planting system with species database, time machine growth simulation, adaptive grid with snap-to-grid, immersive editor with glassmorphism UI

### Gap Analysis
❌ **Missing:** Professional design tooling layer—the difference between "drawing shapes" and "doing design work"

### Development Approach
**Parallel Tracks** for maximum flexibility:
- **Track 1:** Annotation System (Rich Annotations + Design Layer Toggle)
- **Track 2:** Drawing & Water System (Line/Polyline + Water Toolkit + Custom Imagery)
- **Track 3:** Collaboration & Presentation (Comments + Phasing + Export)
- **Track 4:** Advanced Features (Guild Builder + Offline Mode)

Each track can be developed independently, deployed incrementally, and tested in isolation before integration.

---

## Overall Architecture

### Parallel Track Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      Shared Foundation                       │
│  - Database: Turso (libSQL)                                 │
│  - UI: shadcn/ui + Tailwind                                 │
│  - Map: MapLibre GL JS + MapboxDraw                         │
│  - Storage: R2                                              │
│  - Context: Immersive Map UI patterns                       │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
    ┌──────┴──────┐ ┌────┴────┐ ┌───────┴───────┐ ┌───┴────┐
    │   Track 1   │ │ Track 2 │ │   Track 3     │ │Track 4 │
    │ Annotation  │ │Drawing &│ │Collaboration &│ │Advanced│
    │   System    │ │  Water  │ │ Presentation  │ │Features│
    └─────────────┘ └─────────┘ └───────────────┘ └────────┘
```

### Integration Points

**Data Model Integration:**
- Core entities: `zones`, `plantings`, `lines` (Track 2 creates lines)
- Track 1 extends with: `annotations`, `design_layers`
- Track 2 extends with: `water_properties`, `custom_imagery`
- Track 3 extends with: `farm_collaborators`, `map_comments`, `implementation_phases`
- Track 4 extends with: `guilds`, `guild_members`, `offline_cache`

**UI Integration:**
- **Bottom Drawer** serves all tracks (tabbed interface)
- **Map Control Panel** consolidates settings (layers, imagery, phases)
- **Drawing Toolbar** adds new drawing modes (lines, flow arrows, comments)

**API Architecture:**
- Pattern: `/api/farms/[id]/[trackFeature]`
- Independent route handlers per track
- Shared middleware: auth, permissions, offline sync

**Database Strategy:**
- Sequential numbered migrations (no conflicts)
- Additive schema changes only (extend, don't break)
- Each track maintains its own migration files

---

## Track 1: Annotation System

### Priority: CRITICAL (before on-site)
### Features: Rich Annotations + Design Layer Toggle
### Complexity: Medium-High

---

### Feature 1A: Rich Annotations

**Purpose:** Transform map elements into educational content with design rationale, media attachments, cross-references, and flexible tagging.

#### Database Schema

```sql
-- New tables
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK(feature_type IN ('zone', 'planting', 'line')),
  design_rationale TEXT NOT NULL, -- First-class required field
  rich_notes TEXT, -- Markdown supported
  tags TEXT, -- JSON array: ["mycorrhizal", "phase-1"]
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE media_attachments (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  file_url TEXT NOT NULL, -- R2 storage path
  thumbnail_url TEXT, -- Generated thumbnail
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE TABLE external_links (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_annotations_farm_feature ON annotations(farm_id, feature_id, feature_type);
CREATE INDEX idx_annotations_tags ON annotations(tags); -- JSON search
CREATE INDEX idx_media_annotation ON media_attachments(annotation_id);
CREATE INDEX idx_links_annotation ON external_links(annotation_id);
```

#### TypeScript Interfaces

```typescript
interface Annotation {
  id: string;
  farm_id: string;
  feature_id: string;
  feature_type: 'zone' | 'planting' | 'line';
  design_rationale: string; // Required, prominent
  rich_notes: string; // Markdown
  tags: string[]; // JSON array
  created_at: number;
  updated_at: number;
  created_by: string;
}

interface MediaAttachment {
  id: string;
  annotation_id: string;
  type: 'image' | 'video';
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  display_order: number;
  uploaded_at: number;
}

interface ExternalLink {
  id: string;
  annotation_id: string;
  url: string;
  title: string;
  description?: string;
  display_order: number;
}
```

#### API Routes

```
POST   /api/farms/[id]/annotations
  Body: { feature_id, feature_type, design_rationale, rich_notes?, tags? }
  Returns: Created annotation

GET    /api/farms/[id]/annotations?feature_id={id}&feature_type={type}
  Query: feature_id (optional), feature_type (optional), tags[] (optional)
  Returns: Annotations array (filtered)

PATCH  /api/farms/[id]/annotations/[annotationId]
  Body: Partial<Annotation>
  Returns: Updated annotation

DELETE /api/farms/[id]/annotations/[annotationId]
  Returns: Success/error

POST   /api/annotations/[id]/media
  Body: multipart/form-data (file, caption?, display_order?)
  Returns: MediaAttachment (uploaded to R2, thumbnail generated)

DELETE /api/annotations/[id]/media/[mediaId]
  Returns: Success/error (also deletes from R2)
```

#### UI Components

```
components/annotations/
├── annotation-panel.tsx
│   └─ Main expandable panel (extends bottom drawer "Details" tab)
│      Shows when feature selected, editable for designers
│
├── design-rationale-field.tsx
│   └─ Prominent textarea, labeled "Why is this here?"
│      Required field, max 500 chars (encourages concise rationale)
│
├── rich-text-editor.tsx
│   └─ Markdown editor using Tiptap
│      Toolbar: bold, italic, headers (h1-h3), lists, links
│      Preview mode toggle
│
├── media-gallery.tsx
│   └─ Grid of image/video thumbnails
│      Click to expand, drag to reorder, caption editing
│
├── media-upload-button.tsx
│   └─ Upload trigger (accept: image/*, video/*)
│      Client-side resize (max 3000px), thumbnail generation
│      Direct R2 upload via signed URL
│
├── external-links-list.tsx
│   └─ Editable list of links
│      Add/edit/delete, display with title + description
│
├── tag-input.tsx
│   └─ Multi-select tag creation
│      Auto-suggest existing tags, create new on-the-fly
│      Color-coded badges
│
└── annotation-read-only.tsx
    └─ Public view (no edit controls)
       Display-only for viewers and public gallery
```

#### Implementation Notes

**1. Extend Bottom Drawer Pattern**
- Add "Details" tab to existing tabs (Zones, Plantings, Filters)
- Show annotation panel when feature selected
- Lazy load annotations (only fetch when tab opened)

**2. Design Rationale as Primary Field**
- Place at top of form, large font, clear label
- Make it feel important—not buried in "notes"
- Character counter encourages brevity (500 char limit)

**3. Rich Text Editing**
- Use Tiptap (React-based, extensible, markdown support)
- Start minimal: bold, italic, headers, lists, links
- Markdown storage (portable, future-proof)

**4. Media Uploads**
- Client-side processing:
  ```typescript
  import imageCompression from 'browser-image-compression';

  async function uploadMedia(file: File) {
    // Resize to max 3000px
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 3000
    });

    // Generate thumbnail (300px)
    const thumbnail = await imageCompression(file, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 300
    });

    // Upload both to R2 (get signed URLs from API)
    const originalUrl = await uploadToR2(compressed);
    const thumbnailUrl = await uploadToR2(thumbnail);

    return { originalUrl, thumbnailUrl };
  }
  ```

**5. Tag System**
- Store as JSON array in SQLite: `'["mycorrhizal", "phase-1", "grant-deliverable"]'`
- Query using JSON functions:
  ```sql
  SELECT * FROM annotations
  WHERE json_extract(tags, '$') LIKE '%mycorrhizal%'
  ```
- Auto-suggest: Query distinct tags from all annotations
- Filter map by tags (add to map controls)

**6. Performance Considerations**
- Lazy load annotations (only when feature clicked)
- Paginate media gallery for annotations with many images
- Thumbnail CDN caching (R2 public URLs with cache headers)

#### Optional Enhancements (Nice-to-Have)

- **Voice-to-text:** Use Web Speech API for field notes (mobile-friendly)
- **Drag-and-drop reordering:** Media gallery reorder via drag handles
- **@ mentions:** Link to other features in notes (`@ZoneA3`, `@ChestnutGrove`)
- **Export annotations as PDF:** Generate report from all annotations

---

### Feature 1B: Design Layer Toggle

**Purpose:** Organize features into named system layers (Water, Nursery, Infrastructure) and toggle visibility independently, enabling designers to focus on one system at a time.

#### Database Schema

```sql
-- New table
CREATE TABLE design_layers (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT, -- Optional RGBA hex: #3b82f680
  description TEXT,
  visible INTEGER NOT NULL DEFAULT 1, -- Boolean
  locked INTEGER NOT NULL DEFAULT 0, -- Boolean (prevent accidental edits)
  display_order INTEGER NOT NULL DEFAULT 0, -- Z-index
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Extend existing tables
ALTER TABLE zones ADD COLUMN layer_ids TEXT; -- JSON array
ALTER TABLE plantings ADD COLUMN layer_ids TEXT; -- JSON array
-- Lines table will also get this (created in Track 2)

-- Indexes
CREATE INDEX idx_layers_farm ON design_layers(farm_id, display_order);
```

#### TypeScript Interfaces

```typescript
interface DesignLayer {
  id: string;
  farm_id: string;
  name: string;
  color?: string; // RGBA hex
  description?: string;
  visible: boolean;
  locked: boolean;
  display_order: number;
  created_at: number;
}

// Extend existing interfaces
interface Zone {
  // ... existing fields
  layer_ids: string[]; // Can belong to multiple layers
}

interface Planting {
  // ... existing fields
  layer_ids: string[];
}
```

#### API Routes

```
POST   /api/farms/[id]/layers
  Body: { name, color?, description? }
  Returns: Created layer (auto-set display_order)

GET    /api/farms/[id]/layers
  Returns: Array of layers (ordered by display_order)

PATCH  /api/farms/[id]/layers/[layerId]
  Body: Partial<DesignLayer> (name, color, visible, locked, display_order)
  Returns: Updated layer

DELETE /api/farms/[id]/layers/[layerId]
  Validation: Check for features assigned to this layer
  Behavior: Prompt user to reassign features or unassign
  Returns: Success/error

PATCH  /api/farms/[id]/zones/[zoneId]/layers
  Body: { layer_ids: string[] }
  Returns: Updated zone

PATCH  /api/farms/[id]/plantings/[plantingId]/layers
  Body: { layer_ids: string[] }
  Returns: Updated planting
```

#### UI Components

```
components/layers/
├── layer-panel.tsx
│   └─ Main layer control (right sidebar or FAB menu item)
│      List of layers with visibility toggles, reorder handles
│
├── layer-list.tsx
│   └─ Draggable list (react-beautiful-dnd or similar)
│      Each item: eye icon (toggle), lock icon, name, color swatch
│
├── layer-item.tsx
│   └─ Single layer row
│      Eye icon (toggle visibility), lock (prevent edits)
│      Drag handle (reorder), edit button (rename/color)
│
├── layer-create-dialog.tsx
│   └─ Create new layer form
│      Input: name (required), color (optional), description
│
├── layer-assignment-picker.tsx
│   └─ Multi-select checkboxes for assigning feature to layers
│      Shows in zone/planting create/edit forms
│      Bulk assignment: select multiple features, assign to layer
│
└── layer-solo-button.tsx
    └─ "Solo" mode toggle (like Photoshop Option+Click)
       Click layer name to show ONLY that layer
       Click again to restore all visible layers
```

#### Implementation Notes

**1. Default Layers on Farm Creation**
- Auto-create 5 sensible defaults when farm created:
  ```typescript
  const defaultLayers = [
    { name: "Water Systems", color: "#0ea5e980" },
    { name: "Plantings", color: "#22c55e80" },
    { name: "Structures", color: "#ef444480" },
    { name: "Zones", color: "#eab30880" },
    { name: "Annotations", color: "#a855f780" },
  ];
  ```
- User can rename, delete, or add more

**2. Layer Filtering in MapLibre**
- Use filter expressions to show/hide based on layer visibility:
  ```typescript
  const visibleLayerIds = layers.filter(l => l.visible).map(l => l.id);

  map.setFilter('colored-zones-fill', [
    'any',
    ['==', ['length', ['get', 'layer_ids']], 0], // Show unassigned
    ...visibleLayerIds.map(layerId => [
      'in', layerId, ['get', 'layer_ids']
    ])
  ]);

  // Same for colored-zones-stroke, plantings layer, lines layer
  ```

**3. Solo Mode**
- Click layer name (not eye icon) to activate solo:
  ```typescript
  function toggleSolo(layerId: string) {
    if (soloLayer === layerId) {
      // Exit solo mode, restore previous visibility
      setSoloLayer(null);
      restorePreviousVisibility();
    } else {
      // Enter solo mode
      savePreviousVisibility();
      setSoloLayer(layerId);
      setAllLayersHidden();
      setLayerVisible(layerId, true);
    }
  }
  ```

**4. Layer Assignment UI**
- Zone/planting create form: checkboxes for layers
- Bulk assignment: select multiple features on map, right-click → "Assign to layer..."
- Visual feedback: selected features highlight, show assignment dialog

**5. Visual Differentiation (Optional Layer Tint)**
- If layer has color set, add semi-transparent overlay:
  ```typescript
  map.addLayer({
    id: `layer-tint-${layerId}`,
    type: 'fill',
    source: 'zones-source',
    paint: {
      'fill-color': layer.color,
      'fill-opacity': 0.15
    },
    filter: ['in', layerId, ['get', 'layer_ids']]
  });
  ```

**6. Layer Locking**
- Locked layers: prevent draw/edit/delete on features
- Show lock icon, cursor changes to "not-allowed"
- Unlock to edit

#### Optional Enhancements (Nice-to-Have)

- **Layer groups/nesting:** Parent layers with children (e.g., "Water Systems" → "Swales", "Ponds")
- **Layer blend modes:** Multiply, overlay for advanced visual effects
- **Export specific layers:** Download GeoJSON of just one layer
- **Layer-specific permissions:** Collaboration context (Track 3)—lock layers for certain roles

---

### Track 1 Success Criteria

**Acceptance Tests:**
1. Designer can add design rationale to any zone (required field enforced)
2. Designer can attach 3 images with captions to a planting
3. Designer can create custom tag "mycorrhizal-guild" and filter map by it
4. Designer can create "Nursery" layer, assign 5 zones to it, toggle visibility
5. Designer can solo "Water Systems" layer to see only water features
6. Public viewer sees annotations in read-only mode (no edit controls)

**Performance Benchmarks:**
- Annotation panel opens in <200ms (lazy load)
- Image upload completes in <3s for 5MB image (with thumbnail generation)
- Layer visibility toggle updates map in <100ms
- Map renders 100+ zones across 5 layers without lag (<60fps)

---

## Track 2: Drawing & Water System

### Priority: CRITICAL (before on-site)
### Features: Line/Polyline Drawing + Water Design Toolkit + Custom Imagery Upload
### Complexity: High

---

### Feature 2A: Line/Polyline Drawing

**Purpose:** Enable drawing open-ended lines for swales, flow paths, fence lines, contours, hedge rows, and directional indicators.

#### Database Schema

```sql
CREATE TABLE lines (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  geometry TEXT NOT NULL, -- GeoJSON LineString as TEXT
  line_type TEXT NOT NULL DEFAULT 'custom', -- 'swale' | 'flow_path' | 'fence' | 'hedge' | 'contour' | 'custom'
  label TEXT,
  style TEXT NOT NULL, -- JSON: { color, width, dashArray?, opacity, arrowDirection? }
  layer_ids TEXT, -- JSON array (Track 1 integration)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_lines_farm ON lines(farm_id);
CREATE INDEX idx_lines_type ON lines(line_type);
```

#### TypeScript Interfaces

```typescript
interface Line {
  id: string;
  farm_id: string;
  user_id: string;
  geometry: string; // GeoJSON LineString
  line_type: 'swale' | 'flow_path' | 'fence' | 'hedge' | 'contour' | 'custom';
  label?: string;
  style: LineStyle;
  layer_ids: string[];
  created_at: number;
  updated_at: number;
}

interface LineStyle {
  color: string; // Hex
  width: number; // Pixels
  dashArray?: number[]; // [2, 2] for dashed, [0.5, 2] for dotted
  opacity: number; // 0-1
  arrowDirection?: 'none' | 'forward' | 'reverse' | 'both';
}

// Predefined styles
const LINE_TYPE_STYLES: Record<string, LineStyle> = {
  swale: { color: '#0ea5e9', width: 3, opacity: 0.8, arrowDirection: 'none' },
  flow_path: { color: '#06b6d4', width: 2, dashArray: [4, 2], opacity: 0.7, arrowDirection: 'forward' },
  fence: { color: '#71717a', width: 2, dashArray: [1, 3], opacity: 0.6, arrowDirection: 'none' },
  hedge: { color: '#22c55e', width: 3, opacity: 0.7, arrowDirection: 'none' },
  contour: { color: '#78716c', width: 1, opacity: 0.5, arrowDirection: 'none' },
  custom: { color: '#64748b', width: 2, opacity: 0.7, arrowDirection: 'none' },
};
```

#### API Routes

```
POST   /api/farms/[id]/lines
  Body: { geometry (GeoJSON LineString), line_type, label?, style? }
  Returns: Created line (auto-applies style if not provided)

GET    /api/farms/[id]/lines?line_type={type}
  Query: line_type (optional filter)
  Returns: Array of lines

PATCH  /api/farms/[id]/lines/[lineId]
  Body: Partial<Line> (geometry, label, style, layer_ids)
  Returns: Updated line

DELETE /api/farms/[id]/lines/[lineId]
  Returns: Success/error
```

#### UI Components

```
components/drawing/
├── line-drawing-mode.tsx
│   └─ MapboxDraw integration for line_string mode
│      Activate via drawing toolbar button
│
├── line-style-picker.tsx
│   └─ Color picker, width slider, dash pattern selector
│      Presets for common types (swale, flow path, fence)
│
├── arrow-direction-picker.tsx
│   └─ Radio buttons: None, Forward, Reverse, Both
│      Visual preview of arrow placement
│
├── line-type-selector.tsx
│   └─ Dropdown: Swale, Flow Path, Fence, Hedge, Contour, Custom
│      Auto-applies predefined style on selection
│
└── line-detail-panel.tsx
    └─ Edit line properties (extends bottom drawer)
       Change type, style, label, layer assignment
```

#### Implementation Notes

**1. MapboxDraw Native Support**
- Enable `draw_line_string` mode:
  ```typescript
  draw.changeMode('draw_line_string');
  ```
- Listen for `draw.create` event:
  ```typescript
  map.on('draw.create', (e) => {
    const lineFeature = e.features[0]; // GeoJSON LineString
    saveLineToDatabase(lineFeature);
  });
  ```

**2. Line Rendering with MapLibre**
- Add line layer with dynamic styling:
  ```typescript
  map.addSource('lines-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: lineFeatures }
  });

  map.addLayer({
    id: 'design-lines',
    type: 'line',
    source: 'lines-source',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-dasharray': ['coalesce', ['get', 'dashArray'], [1, 0]], // Default solid
      'line-opacity': ['get', 'opacity']
    }
  });
  ```

**3. Arrow Rendering**
- Use symbol layer with custom arrow icon:
  ```typescript
  // Load arrow icon image
  map.loadImage('/icons/arrow.png', (error, image) => {
    map.addImage('arrow-icon', image);
  });

  map.addLayer({
    id: 'line-arrows',
    type: 'symbol',
    source: 'lines-source',
    filter: ['!=', ['get', 'arrowDirection'], 'none'],
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 100, // pixels between arrows
      'icon-image': 'arrow-icon',
      'icon-size': 0.5,
      'icon-rotation-alignment': 'map',
      'icon-rotate': [
        'case',
        ['==', ['get', 'arrowDirection'], 'reverse'], 180,
        ['==', ['get', 'arrowDirection'], 'both'],
          ['interpolate', ['linear'], ['line-progress'], 0, 0, 1, 180],
        0 // forward
      ]
    }
  });
  ```

**4. Predefined Line Types**
- When user selects type (swale, fence, etc.), auto-apply style
- User can customize style after auto-apply
- Store final style in database (overrides default)

**5. Annotation Integration**
- Lines can have annotations (Track 1)
- Click line → bottom drawer opens → Details tab shows annotation
- Same pattern as zones/plantings

**6. Snap-to-Grid for Lines**
- At zoom 20+, line vertices snap to grid intersections
- Use existing snap-to-grid logic from enhanced zoom feature

#### Optional Enhancements (Nice-to-Have)

- **Length measurement on hover:** Show line length in feet/meters
- **Convert polyline to polygon:** Right-click → "Close shape"
- **Bezier curves:** Smooth flow paths for organic water movement
- **Snap to contours:** Swale lines snap to elevation contours (requires DEM data)

---

### Feature 2B: Water Design Toolkit

**Purpose:** Specialized tools for water system design—flow arrows, catchment calculations, swale volume estimation, and water network topology.

**Dependencies:** Requires Feature 2A (Line/Polyline Drawing)

#### Database Schema

```sql
-- Extend lines table
ALTER TABLE lines ADD COLUMN water_properties TEXT; -- JSON

-- Extend zones table
ALTER TABLE zones ADD COLUMN catchment_properties TEXT; -- JSON
ALTER TABLE zones ADD COLUMN swale_properties TEXT; -- JSON

-- Example JSON structures:
-- water_properties: { flow_type: 'surface' | 'underground' | 'seasonal', flow_rate_estimate: '5 gpm', source_feature_id: 'zone-123', destination_feature_id: 'pond-456' }
-- catchment_properties: { is_catchment: true, rainfall_inches_per_year: 40, estimated_capture_gallons: 15000, destination_feature_id: 'swale-789' }
-- swale_properties: { is_swale: true, length_feet: 150, cross_section_width_feet: 3, cross_section_depth_feet: 1.5, estimated_volume_gallons: 2500, overflow_destination_id: 'pond-101' }
```

#### TypeScript Interfaces

```typescript
interface WaterProperties {
  flow_type: 'surface' | 'underground' | 'seasonal';
  flow_rate_estimate?: string; // User input, free text
  source_feature_id?: string;
  destination_feature_id?: string;
}

interface CatchmentProperties {
  is_catchment: boolean;
  rainfall_inches_per_year?: number;
  estimated_capture_gallons?: number; // Auto-calculated
  destination_feature_id?: string;
}

interface SwaleProperties {
  is_swale: boolean;
  length_feet?: number; // Auto-calculated from geometry
  cross_section_width_feet?: number; // User input
  cross_section_depth_feet?: number; // User input
  estimated_volume_gallons?: number; // Calculated
  overflow_destination_id?: string;
}
```

#### API Routes

```
POST   /api/farms/[id]/water/calculate-catchment
  Body: { zone_id, rainfall_inches_per_year }
  Action: Calculates area × rainfall = capture volume
  Returns: { estimated_capture_gallons }

POST   /api/farms/[id]/water/calculate-swale-volume
  Body: { zone_id, cross_section_width_feet, cross_section_depth_feet }
  Action: Calculates length × width × depth × 0.5 × 7.48
  Returns: { estimated_volume_gallons }

GET    /api/farms/[id]/water/flow-network
  Action: Builds topology graph of water system (sources → destinations)
  Returns: { nodes: [...], edges: [...] } (graph structure)

GET    /api/farms/[id]/water/rainfall?lat={lat}&lng={lng}
  Action: Lookup NOAA average annual rainfall for location
  Returns: { rainfall_inches_per_year }
```

#### UI Components

```
components/water/
├── flow-arrow-tool.tsx
│   └─ Draw flow direction lines (uses Line feature with arrowDirection)
│      Predefined style: light blue, dashed, forward arrow
│
├── catchment-calculator.tsx
│   └─ Zone property panel extension
│      Toggle "Is Catchment", input rainfall, show calculated gallons
│
├── swale-designer.tsx
│   └─ Zone/line property panel extension
│      Input cross-section dimensions, show volume calculation
│      Visual cross-section preview (SVG diagram)
│
├── water-connection-picker.tsx
│   └─ Dropdown to select source/destination features
│      "This catchment feeds..." → select swale/pond
│
├── water-system-panel.tsx
│   └─ Overview of all water features (bottom drawer tab)
│      Summary: total catchment area, total storage volume, flow paths
│
└── rainfall-data-input.tsx
    └─ Manual input or auto-lookup button
       Fetches from NOAA API or user enters manually
```

#### Implementation Notes

**1. Flow Arrows**
- Use Line feature (Feature 2A) with special water styling
- Animated dashes for flowing effect:
  ```typescript
  map.setPaintProperty('flow-lines', 'line-dasharray', [0, 2, 2]);

  // Animate by shifting dash offset
  let offset = 0;
  setInterval(() => {
    offset = (offset + 0.1) % 4;
    map.setPaintProperty('flow-lines', 'line-dasharray-offset', offset);
  }, 50);
  ```

**2. Catchment Calculator**
- Auto-calculate when zone marked as catchment:
  ```typescript
  function calculateCatchment(zoneGeometry: Polygon, rainfallInches: number) {
    const areaSquareMeters = turf.area(zoneGeometry);
    const areaSquareFeet = areaSquareMeters * 10.764;
    const rainfallFeet = rainfallInches / 12;
    const captureGallons = areaSquareFeet * rainfallFeet * 7.48; // ft³ to gallons
    return Math.round(captureGallons);
  }
  ```

**3. Rainfall Data Lookup**
- NOAA Climate Data API (free, requires API key):
  ```typescript
  async function getRainfall(lat: number, lng: number) {
    const response = await fetch(
      `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=ANNUAL&datatypeid=PRCP&locationid=FIPS:${getCountyFIPS(lat, lng)}`,
      { headers: { token: process.env.NOAA_API_KEY } }
    );
    const data = await response.json();
    return data.results[0].value; // inches per year
  }
  ```
- Fallback: Manual input if API unavailable

**4. Swale Volume Calculator**
- Auto-calculate length from geometry:
  ```typescript
  const lengthMeters = turf.length(lineGeometry, { units: 'meters' });
  const lengthFeet = lengthMeters * 3.28084;
  ```
- Triangular cross-section assumption:
  ```typescript
  const volumeCubicFeet = lengthFeet × widthFeet × depthFeet × 0.5;
  const volumeGallons = volumeCubicFeet × 7.48;
  ```
- Display in UI with visual cross-section diagram (SVG)

**5. Water Network Visualization**
- Build graph from source/destination connections
- Render connection lines on map (dashed, animated)
- Show flow direction with arrows
- Topology panel: tree view of water system

**6. Water System Summary Panel**
- Total catchment area (sum of all catchment zones)
- Total storage capacity (sum of ponds, swales)
- Flow paths count
- Water balance estimate (catchment vs storage)

#### Optional Enhancements (Nice-to-Have)

- **Contour line generation:** From DEM data (requires server-side processing with GDAL)
- **Automatic swale placement:** Suggest swale paths along contours
- **Water flow accumulation overlay:** Computationally intensive, pre-compute from DEM
- **Seasonal flow variations:** Wet/dry season toggle
- **Water quality indicators:** pH, turbidity tracking (advanced)

---

### Feature 2C: Custom Imagery Upload

**Purpose:** Upload drone orthomosaics or custom imagery and position as base map layers, replacing generic satellite with current high-resolution property photos.

#### Database Schema

```sql
CREATE TABLE custom_imagery (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  original_file_url TEXT NOT NULL, -- R2 storage (original)
  tile_url_template TEXT, -- R2 storage (tiled) - "{z}/{x}/{y}.png"
  bounds TEXT NOT NULL, -- JSON: { north, south, east, west }
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  file_size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploading', -- 'uploading' | 'processing' | 'ready' | 'error'
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_imagery_farm ON custom_imagery(farm_id);
CREATE INDEX idx_imagery_status ON custom_imagery(status);
```

#### TypeScript Interfaces

```typescript
interface CustomImagery {
  id: string;
  farm_id: string;
  uploaded_by: string;
  name: string;
  description?: string;
  original_file_url: string;
  tile_url_template?: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  uploaded_at: number;
  file_size_bytes: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}
```

#### API Routes

```
POST   /api/farms/[id]/imagery/upload
  Body: { name, description?, file_size_bytes }
  Returns: { imagery_id, signed_upload_url } (R2 signed URL)

POST   /api/farms/[id]/imagery/[imageryId]/complete
  Body: { bounds: { north, south, east, west } }
  Action: Marks upload complete, queues processing job
  Returns: Updated imagery

POST   /api/farms/[id]/imagery/[imageryId]/process
  Action: Server-side tile generation (async job)
  Returns: { job_id }

GET    /api/farms/[id]/imagery
  Returns: Array of custom imagery (all statuses)

PATCH  /api/farms/[id]/imagery/[imageryId]/bounds
  Body: { bounds }
  Returns: Updated imagery (for manual alignment)

DELETE /api/farms/[id]/imagery/[imageryId]
  Action: Delete from database + R2 storage
  Returns: Success/error
```

#### UI Components

```
components/imagery/
├── imagery-upload-dialog.tsx
│   └─ File picker, upload progress bar
│      Drag-and-drop zone, accept: .jpg, .png, .tif
│
├── imagery-alignment-tool.tsx
│   └─ Interactive corner dragging
│      Show image overlay with 4 draggable corner handles
│      Real-time preview as user drags
│
├── imagery-layer-selector.tsx
│   └─ Dropdown in map controls
│      Switch between custom imagery layers
│
├── imagery-opacity-slider.tsx
│   └─ Slider (0-100%)
│      Fade between custom imagery and satellite
│
└── imagery-processing-status.tsx
    └─ Progress indicator
       "Processing... 45% complete" (polling job status)
```

#### Implementation Notes

**1. Upload Flow**
```typescript
// Client-side
async function uploadImagery(file: File, farmId: string) {
  // Step 1: Request signed URL
  const { imagery_id, signed_upload_url } = await fetch(
    `/api/farms/${farmId}/imagery/upload`,
    { method: 'POST', body: JSON.stringify({
      name: file.name,
      file_size_bytes: file.size
    })}
  ).then(r => r.json());

  // Step 2: Upload directly to R2 (bypasses Next.js size limits)
  await fetch(signed_upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  // Step 3: Notify API upload complete (triggers processing)
  await fetch(`/api/farms/${farmId}/imagery/${imagery_id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ bounds: manualAlignmentBounds })
  });

  return imagery_id;
}
```

**2. Image Processing (Server-Side)**
```typescript
// For small images (<50MB): store as-is
// For large images (>50MB): generate tile pyramid

import sharp from 'sharp';

async function processimagery(imageryId: string) {
  const imagery = await db.getImagery(imageryId);
  const imageBuffer = await downloadFromR2(imagery.original_file_url);

  // Check size
  if (imagery.file_size_bytes < 50 * 1024 * 1024) {
    // Small image, use directly (no tiling)
    await db.updateImagery(imageryId, { status: 'ready' });
    return;
  }

  // Large image, generate tiles for zoom 14-20
  for (let z = 14; z <= 20; z++) {
    const tiles = await generateTilesForZoom(imageBuffer, z, imagery.bounds);

    for (const tile of tiles) {
      const tileKey = `farms/${imagery.farm_id}/imagery/${imageryId}/${z}/${tile.x}/${tile.y}.png`;
      await uploadToR2(tileKey, tile.buffer);
    }

    // Update progress
    const progress = ((z - 14) / 6) * 100;
    await db.updateImagery(imageryId, {
      status: 'processing',
      processing_progress: progress
    });
  }

  // Mark ready
  await db.updateImagery(imageryId, {
    status: 'ready',
    tile_url_template: `https://r2.domain.com/farms/${imagery.farm_id}/imagery/${imageryId}/{z}/{x}/{y}.png`
  });
}

function generateTilesForZoom(imageBuffer, zoom, bounds) {
  // Convert bounds to tile coordinates
  // Slice image into 256x256 tiles
  // Return array of { x, y, buffer }
  // (Tile math implementation omitted for brevity)
}
```

**3. Manual Alignment UI**
```typescript
// Show image with draggable corner handles
function ImageryAlignmentTool({ imagery, onBoundsChange }) {
  const [corners, setCorners] = useState({
    nw: [imagery.bounds.west, imagery.bounds.north],
    ne: [imagery.bounds.east, imagery.bounds.north],
    sw: [imagery.bounds.west, imagery.bounds.south],
    se: [imagery.bounds.east, imagery.bounds.south],
  });

  function handleCornerDrag(corner, newLngLat) {
    setCorners({ ...corners, [corner]: newLngLat });

    // Update bounds
    const newBounds = {
      north: Math.max(corners.nw[1], corners.ne[1]),
      south: Math.min(corners.sw[1], corners.se[1]),
      east: Math.max(corners.ne[0], corners.se[0]),
      west: Math.min(corners.nw[0], corners.sw[0]),
    };

    onBoundsChange(newBounds);
  }

  return (
    <>
      {Object.entries(corners).map(([corner, lngLat]) => (
        <Marker
          key={corner}
          longitude={lngLat[0]}
          latitude={lngLat[1]}
          draggable
          onDragEnd={(e) => handleCornerDrag(corner, [e.lngLat.lng, e.lngLat.lat])}
        >
          <div className="w-6 h-6 bg-red-500 rounded-full cursor-move" />
        </Marker>
      ))}
    </>
  );
}
```

**4. MapLibre Integration**
```typescript
// Add custom imagery as raster source
map.addSource(`custom-imagery-${imageryId}`, {
  type: 'raster',
  tiles: imagery.tile_url_template
    ? [imagery.tile_url_template]
    : [imagery.original_file_url], // Use original for small images
  tileSize: 256,
  bounds: [
    imagery.bounds.west,
    imagery.bounds.south,
    imagery.bounds.east,
    imagery.bounds.north
  ]
});

map.addLayer({
  id: `custom-imagery-layer-${imageryId}`,
  type: 'raster',
  source: `custom-imagery-${imageryId}`,
  paint: {
    'raster-opacity': opacityValue // Controlled by slider
  }
}, 'satellite'); // Insert below satellite (or replace it)
```

**5. GeoTIFF Support (Optional Phase 2)**
```typescript
import GeoTIFF from 'geotiff';

async function readGeoTIFF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  // Extract bounds from georeference
  const bbox = image.getBoundingBox(); // [west, south, east, north]

  return {
    bounds: {
      north: bbox[3],
      south: bbox[1],
      east: bbox[2],
      west: bbox[0]
    },
    // Convert to PNG for upload
    imageData: await image.readRasters()
  };
}
```

**6. Multiple Imagery Layers**
- Support multiple uploads per farm (seasonal comparisons)
- Layer selector dropdown: "Spring 2026 Drone", "Fall 2025 Aerial"
- Opacity slider fades between imagery and satellite

#### Optional Enhancements (Nice-to-Have)

- **Semi-automatic alignment:** Feature detection to suggest corner positions
- **Imagery metadata:** Date captured, resolution (GSD), source
- **Export aligned imagery:** Download as GeoTIFF with embedded coordinates
- **Change detection:** Compare two imagery layers, highlight differences

---

### Track 2 Success Criteria

**Acceptance Tests:**
1. Designer can draw swale line with blue styling and length auto-calculated
2. Designer can mark zone as catchment, input rainfall, see estimated capture gallons
3. Designer can upload 25MB drone image, align corners, see it as base layer
4. Designer can draw flow arrow from catchment to swale to pond (animated flow)
5. Water system panel shows total catchment area and storage capacity
6. Custom imagery layer toggles on/off without affecting other map layers

**Performance Benchmarks:**
- Line drawing completes in <50ms (smooth interaction)
- Catchment calculation instant (<100ms)
- Image upload completes in <10s for 25MB file (R2 direct)
- Tile processing completes in <2 minutes for 100MB image
- Custom imagery layer loads tiles in <500ms (R2 CDN)

---

## Track 3: Collaboration & Presentation

### Priority: IMPORTANT (before design delivery) + NEEDED (before launch)
### Features: Collaboration & Comments + Implementation Phasing + Export & Presentation Mode
### Complexity: Medium-High

---

### Feature 3A: Collaboration & Comments

**Purpose:** Enable multi-user collaboration (designer + landowner) with role-based permissions, spatial comments, activity tracking, and email notifications.

#### Database Schema

```sql
CREATE TABLE farm_collaborators (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('designer', 'landowner', 'viewer')),
  invited_by TEXT NOT NULL,
  invited_at INTEGER NOT NULL DEFAULT (unixepoch()),
  accepted_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'removed')),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE(farm_id, user_id)
);

CREATE TABLE map_comments (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  text TEXT NOT NULL,
  parent_id TEXT, -- For threaded replies
  resolved INTEGER NOT NULL DEFAULT 0, -- Boolean
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES map_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'zone_added' | 'planting_created' | 'comment_added' | etc.
  entity_type TEXT, -- 'zone' | 'planting' | 'line' | 'comment'
  entity_id TEXT,
  details TEXT, -- JSON metadata
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Extend farms table
ALTER TABLE farms ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'unlisted', 'public'));
ALTER TABLE farms ADD COLUMN allow_comments_public INTEGER NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX idx_collaborators_farm ON farm_collaborators(farm_id);
CREATE INDEX idx_collaborators_user ON farm_collaborators(user_id);
CREATE INDEX idx_comments_farm ON map_comments(farm_id);
CREATE INDEX idx_comments_parent ON map_comments(parent_id);
CREATE INDEX idx_activity_farm_time ON activity_log(farm_id, timestamp DESC);
```

#### TypeScript Interfaces

```typescript
interface FarmCollaborator {
  id: string;
  farm_id: string;
  user_id: string;
  role: 'designer' | 'landowner' | 'viewer';
  invited_by: string;
  invited_at: number;
  accepted_at?: number;
  status: 'pending' | 'active' | 'removed';
}

interface MapComment {
  id: string;
  farm_id: string;
  author_id: string;
  lat: number;
  lng: number;
  text: string;
  parent_id?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: number;
  created_at: number;
  updated_at: number;
}

interface ActivityLogEntry {
  id: string;
  farm_id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  timestamp: number;
}

// Permission model
type Permission = 'view' | 'comment' | 'edit_annotations' | 'edit_geometry' | 'manage_collaborators';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  designer: ['view', 'comment', 'edit_annotations', 'edit_geometry', 'manage_collaborators'],
  landowner: ['view', 'comment', 'edit_annotations'], // No geometry edits
  viewer: ['view', 'comment'], // Read-only + comment if enabled
};
```

#### API Routes

```
POST   /api/farms/[id]/collaborators
  Body: { email, role }
  Action: Creates pending collaborator, sends email invite
  Returns: Created collaborator

GET    /api/farms/[id]/collaborators
  Returns: Array of collaborators

PATCH  /api/farms/[id]/collaborators/[userId]
  Body: { role }
  Returns: Updated collaborator (role change)

DELETE /api/farms/[id]/collaborators/[userId]
  Action: Sets status to 'removed'
  Returns: Success/error

GET    /api/collaborations/accept?token={token}
  Action: Validates token, activates collaboration
  Returns: Redirect to farm

POST   /api/farms/[id]/comments
  Body: { lat, lng, text, parent_id? }
  Returns: Created comment (triggers notifications)

GET    /api/farms/[id]/comments?resolved={bool}
  Query: resolved (optional filter)
  Returns: Array of comments (with threaded structure)

PATCH  /api/farms/[id]/comments/[commentId]
  Body: { text?, resolved? }
  Returns: Updated comment

DELETE /api/farms/[id]/comments/[commentId]
  Action: Soft delete (sets deleted flag)
  Returns: Success/error

GET    /api/farms/[id]/activity?limit={n}&offset={n}
  Query: limit (default 50), offset (pagination)
  Returns: Array of activity log entries
```

#### UI Components

```
components/collaboration/
├── collaborator-panel.tsx
│   └─ Manage collaborators (bottom drawer tab or settings modal)
│      List of collaborators, invite button, role dropdown
│
├── invite-collaborator-dialog.tsx
│   └─ Email input, role selector
│      "Send Invitation" button
│
├── role-selector.tsx
│   └─ Dropdown: Designer, Landowner, Viewer
│      Tooltip explaining permissions
│
├── comment-marker.tsx
│   └─ Map marker for comments
│      Icon + comment count badge
│      Click to open comment thread
│
├── comment-thread.tsx
│   └─ Display comment + replies (threaded)
│      Reply button, resolve button (for collaborators)
│
├── comment-composer.tsx
│   └─ New comment/reply form
│      Textarea, cancel/submit buttons
│
├── activity-feed.tsx
│   └─ List of recent activity (sidebar or bottom drawer tab)
│      Grouped by day, infinite scroll
│
├── activity-feed-item.tsx
│   └─ Single activity entry
│      Avatar, user name, action, timestamp
│      Click to navigate to entity
│
└── collaboration-notification.tsx
    └─ Toast notification for new comments/changes
       Appears when polling detects updates
```

#### Implementation Notes

**1. Permission Model**
```typescript
function hasPermission(user: User, farm: Farm, permission: Permission): boolean {
  // Farm owner has all permissions
  if (farm.user_id === user.id) return true;

  // Check collaborator role
  const collaborator = farm.collaborators.find(c => c.user_id === user.id && c.status === 'active');
  if (!collaborator) return false;

  const permissions = ROLE_PERMISSIONS[collaborator.role];
  return permissions.includes(permission);
}

// Use in API middleware
async function requirePermission(permission: Permission) {
  return async (req, res, next) => {
    const farm = await getFarm(req.params.farmId);
    const user = req.session.user;

    if (!hasPermission(user, farm, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Example usage
router.post('/api/farms/:id/zones', requirePermission('edit_geometry'), createZone);
router.post('/api/farms/:id/comments', requirePermission('comment'), createComment);
```

**2. Invitation Flow**
```typescript
// API endpoint
async function inviteCollaborator(farmId: string, email: string, role: string, invitedBy: string) {
  // Find or create user
  let user = await db.getUserByEmail(email);
  if (!user) {
    user = await db.createPendingUser(email);
  }

  // Create collaborator record
  const collaborator = await db.createCollaborator({
    farm_id: farmId,
    user_id: user.id,
    role,
    invited_by: invitedBy,
    status: 'pending'
  });

  // Generate magic link token
  const token = jwt.sign({ collaborator_id: collaborator.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Send email
  await sendEmail({
    to: email,
    subject: `You've been invited to collaborate on a permaculture design`,
    html: `
      <p>You've been invited to collaborate on a farm design in Permaculture.Studio.</p>
      <p>Click here to accept: <a href="${process.env.APP_URL}/collaborations/accept?token=${token}">Accept Invitation</a></p>
    `
  });

  return collaborator;
}
```

**3. Comment Pins on Map**
```typescript
// Render comment markers
function CommentMarkers({ comments }: { comments: MapComment[] }) {
  return (
    <>
      {comments.map(comment => (
        <Marker
          key={comment.id}
          longitude={comment.lng}
          latitude={comment.lat}
          onClick={() => openCommentThread(comment.id)}
        >
          <div className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer",
            comment.resolved ? "bg-green-500 opacity-50" : "bg-blue-500"
          )}>
            <MessageCircle className="w-5 h-5 text-white" />
            {comment.reply_count > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {comment.reply_count}
              </div>
            )}
            {comment.resolved && (
              <Check className="absolute bottom-0 right-0 w-4 h-4 text-white bg-green-600 rounded-full p-0.5" />
            )}
          </div>
        </Marker>
      ))}
    </>
  );
}
```

**4. Activity Feed**
```typescript
// Log activity on mutations
async function logActivity(farm_id: string, user_id: string, action: string, entity?: { type: string, id: string }, details?: any) {
  await db.createActivityLogEntry({
    farm_id,
    user_id,
    action,
    entity_type: entity?.type,
    entity_id: entity?.id,
    details: JSON.stringify(details),
    timestamp: Date.now()
  });
}

// Example: Log zone creation
await createZone(zoneData);
await logActivity(farmId, userId, 'zone_added', { type: 'zone', id: zone.id }, { zone_type: zone.user_zone_type });

// Display in feed
function ActivityFeed({ activities }: { activities: ActivityLogEntry[] }) {
  return (
    <div className="space-y-4">
      {groupByDay(activities).map(([day, entries]) => (
        <div key={day}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{day}</h3>
          {entries.map(entry => (
            <div key={entry.id} className="flex gap-3 items-start">
              <Avatar user={entry.user} />
              <div>
                <p className="text-sm">
                  <span className="font-medium">{entry.user.name}</span> {formatAction(entry.action)}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**5. Email Notifications**
```typescript
// Send notification when comment added
async function notifyCollaborators(farmId: string, event: 'comment_added' | 'zone_added', details: any) {
  const collaborators = await db.getActiveCollaborators(farmId);

  for (const collaborator of collaborators) {
    // Skip the user who triggered the event
    if (collaborator.user_id === details.triggeredBy) continue;

    await sendEmail({
      to: collaborator.user.email,
      subject: `New activity on ${details.farmName}`,
      html: `
        <p>There's new activity on a farm you're collaborating on:</p>
        <p>${details.message}</p>
        <p><a href="${process.env.APP_URL}/farm/${farmId}">View Farm</a></p>
        <p><a href="${process.env.APP_URL}/settings/notifications">Unsubscribe</a></p>
      `
    });
  }
}
```

**6. Real-Time Updates (Polling)**
```typescript
// Client-side polling for activity
useEffect(() => {
  const interval = setInterval(async () => {
    const lastCheck = localStorage.getItem(`farm-${farmId}-last-check`);
    const response = await fetch(`/api/farms/${farmId}/activity?since=${lastCheck}`);
    const newActivities = await response.json();

    if (newActivities.length > 0) {
      // Show toast notification
      toast({
        title: `${newActivities.length} new update${newActivities.length > 1 ? 's' : ''}`,
        description: newActivities[0].action,
        action: <Button onClick={refreshData}>Refresh</Button>
      });

      localStorage.setItem(`farm-${farmId}-last-check`, Date.now().toString());
    }
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(interval);
}, [farmId]);
```

#### Optional Enhancements (Nice-to-Have)

- **Real-time presence:** "William is viewing this farm" indicator
- **WebSocket live updates:** Replace polling with Socket.io or similar
- **Comment reactions:** 👍, ❤️, 🤔 emoji reactions
- **@mentions:** Notify specific collaborators (`@daniel check this out`)
- **Export activity log:** Download as CSV for record-keeping

---

### Feature 3B: Implementation Phasing

**Purpose:** Tag design elements by implementation phase (Year 1, Year 2, etc.) and filter map to show phased rollout, integrating with Time Machine for unified timeline visualization.

#### Database Schema

```sql
CREATE TABLE implementation_phases (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL, -- "Phase 1", "Year 1", "Grant Milestone 1"
  description TEXT,
  sequence INTEGER NOT NULL, -- 1, 2, 3... for ordering
  target_year INTEGER, -- Optional year association
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'complete')),
  budget_estimate REAL, -- Optional cost tracking
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  UNIQUE(farm_id, sequence)
);

-- Extend existing tables
ALTER TABLE zones ADD COLUMN phase_id TEXT;
ALTER TABLE zones ADD COLUMN implementation_status TEXT DEFAULT 'planned' CHECK(implementation_status IN ('planned', 'in_progress', 'complete'));

ALTER TABLE plantings ADD COLUMN phase_id TEXT;
ALTER TABLE plantings ADD COLUMN implementation_status TEXT DEFAULT 'planned';

ALTER TABLE lines ADD COLUMN phase_id TEXT;
ALTER TABLE lines ADD COLUMN implementation_status TEXT DEFAULT 'planned';

-- Indexes
CREATE INDEX idx_phases_farm_seq ON implementation_phases(farm_id, sequence);
CREATE INDEX idx_zones_phase ON zones(phase_id);
CREATE INDEX idx_plantings_phase ON plantings(phase_id);
CREATE INDEX idx_lines_phase ON lines(phase_id);
```

#### TypeScript Interfaces

```typescript
interface ImplementationPhase {
  id: string;
  farm_id: string;
  name: string;
  description?: string;
  sequence: number;
  target_year?: number;
  status: 'planned' | 'in_progress' | 'complete';
  budget_estimate?: number;
  created_at: number;
}

// Extend existing interfaces
interface Zone {
  // ... existing fields
  phase_id?: string;
  implementation_status: 'planned' | 'in_progress' | 'complete';
}

interface Planting {
  // ... existing fields
  phase_id?: string;
  implementation_status: 'planned' | 'in_progress' | 'complete';
}

interface Line {
  // ... existing fields
  phase_id?: string;
  implementation_status: 'planned' | 'in_progress' | 'complete';
}
```

#### API Routes

```
POST   /api/farms/[id]/phases
  Body: { name, description?, sequence, target_year?, budget_estimate? }
  Returns: Created phase

GET    /api/farms/[id]/phases
  Returns: Array of phases (ordered by sequence)

PATCH  /api/farms/[id]/phases/[phaseId]
  Body: Partial<ImplementationPhase>
  Returns: Updated phase

DELETE /api/farms/[id]/phases/[phaseId]
  Validation: Check for features assigned to phase
  Action: Prompt user to reassign or set to null
  Returns: Success/error

PATCH  /api/farms/[id]/zones/[zoneId]/phase
  Body: { phase_id, implementation_status? }
  Returns: Updated zone

GET    /api/farms/[id]/phases/[phaseId]/summary
  Returns: {
    zone_count, planting_count, line_count,
    total_area, budget_estimate, status
  }
```

#### UI Components

```
components/phasing/
├── phase-panel.tsx
│   └─ Manage phases (bottom drawer tab or sidebar)
│      List of phases, create button, reorder handles
│
├── phase-create-dialog.tsx
│   └─ Create new phase form
│      Name, description, target year, budget estimate
│
├── phase-filter.tsx
│   └─ Slider: "Show phases 1 through [X]"
│      Map updates to show only selected phase range
│
├── phase-assignment-picker.tsx
│   └─ Dropdown in feature create/edit forms
│      Assign zone/planting/line to phase
│
├── phase-summary-card.tsx
│   └─ Overview card for each phase
│      Feature counts, area, budget, status
│      Click to filter map to just this phase
│
├── phase-timeline.tsx
│   └─ Visual timeline with phase markers
│      Integrates with Time Machine slider
│
└── phase-status-indicator.tsx
    └─ Color-coded badge (planned/in-progress/complete)
       Visual indicator on map features
```

#### Implementation Notes

**1. Default Phases on Farm Creation**
```typescript
async function createFarm(farmData) {
  const farm = await db.createFarm(farmData);

  // Auto-create 3 default phases
  await db.createPhase({ farm_id: farm.id, name: 'Phase 1', sequence: 1 });
  await db.createPhase({ farm_id: farm.id, name: 'Phase 2', sequence: 2 });
  await db.createPhase({ farm_id: farm.id, name: 'Phase 3', sequence: 3 });

  return farm;
}
```

**2. Phase Filtering**
```typescript
// Filter map by phase range
function filterByPhase(maxSequence: number) {
  const visiblePhases = phases.filter(p => p.sequence <= maxSequence).map(p => p.id);

  map.setFilter('colored-zones-fill', [
    'any',
    ['==', ['get', 'phase_id'], null], // Show unphased
    ['in', ['get', 'phase_id'], ['literal', visiblePhases]]
  ]);

  // Same for plantings, lines
}
```

**3. Integration with Time Machine**
```typescript
// Time Machine slider with phase markers
function TimeMachineWithPhases({ phases, currentYear, onYearChange }) {
  return (
    <div className="relative">
      <input
        type="range"
        min={currentYear}
        max={currentYear + 20}
        value={timelineYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
      />

      {/* Phase markers on timeline */}
      {phases.filter(p => p.target_year).map(phase => (
        <div
          key={phase.id}
          className="absolute top-0 w-0.5 h-full bg-primary"
          style={{ left: `${((phase.target_year - currentYear) / 20) * 100}%` }}
        >
          <div className="absolute -top-6 -left-4 text-xs font-medium whitespace-nowrap">
            {phase.name}
          </div>
        </div>
      ))}
    </div>
  );
}

// When slider moves, show phases up to that year
function handleYearChange(year: number) {
  const activePhases = phases.filter(p => !p.target_year || p.target_year <= year);
  const maxSequence = Math.max(...activePhases.map(p => p.sequence));
  filterByPhase(maxSequence);

  // Also apply growth simulation
  applyGrowthSimulation(year);
}
```

**4. Phase Summary Panel**
```typescript
async function getPhaseSummary(phaseId: string) {
  const zones = await db.getZonesByPhase(phaseId);
  const plantings = await db.getPlantingsByPhase(phaseId);
  const lines = await db.getLinesByPhase(phaseId);

  const totalArea = zones.reduce((sum, z) => sum + turf.area(JSON.parse(z.geometry)), 0);

  return {
    zone_count: zones.length,
    planting_count: plantings.length,
    line_count: lines.length,
    total_area_acres: totalArea / 4046.86,
    budget_estimate: phase.budget_estimate,
    status: phase.status
  };
}
```

**5. Status Tracking Visual Differentiation**
```typescript
// Render features with status indicators
map.setPaintProperty('colored-zones-fill', 'fill-opacity', [
  'case',
  ['==', ['get', 'implementation_status'], 'complete'], 0.5, // Desaturated
  ['==', ['get', 'implementation_status'], 'in_progress'], 0.8, // Normal + animated border
  0.6 // Planned
]);

// Add animated border for in-progress
map.addLayer({
  id: 'in-progress-zones',
  type: 'line',
  source: 'zones-source',
  filter: ['==', ['get', 'implementation_status'], 'in_progress'],
  paint: {
    'line-color': '#22c55e',
    'line-width': 4,
    'line-dasharray': [2, 2],
    'line-dasharray-offset': ['interpolate', ['linear'], ['zoom'], 0, 0, 20, 8] // Animated
  }
});
```

#### Optional Enhancements (Nice-to-Have)

- **Gantt chart view:** Visual project timeline
- **Budget tracking:** Running totals, actual vs estimate
- **Phase dependencies:** "Phase 2 blocked until Phase 1 complete"
- **Photo documentation:** Before/after photos per phase
- **Export schedule as ICS:** Import into calendar

---

### Feature 3C: Export & Presentation Mode

**Purpose:** Export designs as images/PDFs and create guided presentation walkthroughs for filming, client presentations, and grant reports.

#### Database Schema

```sql
CREATE TABLE presentations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slides TEXT NOT NULL, -- JSON array of PresentationSlide
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_presentations_farm ON presentations(farm_id);
```

#### TypeScript Interfaces

```typescript
interface Presentation {
  id: string;
  farm_id: string;
  name: string;
  description?: string;
  slides: PresentationSlide[];
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface PresentationSlide {
  id: string;
  order: number;
  camera: {
    center: [number, number]; // [lng, lat]
    zoom: number;
    bearing?: number;
    pitch?: number;
  };
  visible_layers: string[]; // Design layer IDs
  visible_phases: number[]; // Phase sequences
  duration_seconds: number; // How long to stay
  transition_duration_ms: number; // Fly-to duration
  title?: string;
  narration?: string; // Text overlay or speaking notes
  feature_highlight_id?: string; // Optionally highlight specific feature
}
```

#### API Routes

```
POST   /api/farms/[id]/presentations
  Body: { name, description?, slides }
  Returns: Created presentation

GET    /api/farms/[id]/presentations
  Returns: Array of presentations

PATCH  /api/farms/[id]/presentations/[presentationId]
  Body: Partial<Presentation>
  Returns: Updated presentation

DELETE /api/farms/[id]/presentations/[presentationId]
  Returns: Success/error

POST   /api/farms/[id]/export/image
  Body: { width, height, format }
  Action: Captures current map view at specified resolution
  Returns: { image_url } (R2 public URL)

POST   /api/farms/[id]/export/pdf
  Body: { include_legend, include_annotations, include_species_list }
  Action: Generates PDF with map + metadata
  Returns: { pdf_url } (R2 public URL)

GET    /api/farms/[id]/export/geojson
  Action: Exports all features as GeoJSON FeatureCollection
  Returns: GeoJSON (download)
```

#### UI Components

```
components/export/
├── export-menu.tsx
│   └─ Export options (dropdown or modal)
│      Buttons: Export Image, Export PDF, Export GeoJSON
│
├── export-image-dialog.tsx
│   └─ Resolution selector (1080p, 4K, custom)
│      Format: PNG, JPG
│      "Export" button
│
├── export-pdf-dialog.tsx
│   └─ Options checkboxes:
│      ☑ Include legend
│      ☑ Include zone list
│      ☑ Include species list
│      ☑ Include annotations
│      "Generate PDF" button
│
├── presentation-builder.tsx
│   └─ Slide editor (modal or sidebar)
│      Record mode: "Add Slide" captures current view
│      Edit mode: Reorder, adjust camera, add narration
│
├── presentation-slide-editor.tsx
│   └─ Edit individual slide
│      Camera position, layers/phases visible, duration, title, narration
│
├── presentation-player.tsx
│   └─ Full-screen presentation mode
│      Auto-advance slides with fly-to animations
│      Narration text overlay
│
├── presentation-controls.tsx
│   └─ Playback controls (bottom bar)
│      Play, pause, prev, next, exit
│
└── export-progress.tsx
    └─ Progress indicator
       "Generating PDF... 3/10 pages"
```

#### Implementation Notes

**1. Image Export**
```typescript
async function exportImage(width: number = 1920, height: number = 1080, format: 'png' | 'jpg' = 'png') {
  // Capture map canvas
  const canvas = map.getCanvas();
  const dataUrl = canvas.toDataURL(`image/${format}`);

  // For higher resolution, use map.exportImage if available
  // Or resize canvas before capture

  // Upload to R2
  const blob = await (await fetch(dataUrl)).blob();
  const imageUrl = await uploadToR2(blob, `farms/${farmId}/exports/${Date.now()}.${format}`);

  return imageUrl;
}
```

**2. PDF Export**
```typescript
import jsPDF from 'jspdf';

async function exportPDF(options: {
  include_legend: boolean;
  include_annotations: boolean;
  include_species_list: boolean;
}) {
  const pdf = new jsPDF('landscape', 'mm', 'a4');

  // Page 1: Map
  const mapImage = await exportImage(3840, 2160, 'jpg'); // High res
  pdf.addImage(mapImage, 'JPEG', 0, 0, 297, 210); // A4 landscape

  // Title block
  pdf.setFontSize(20);
  pdf.text(farm.name, 10, 10);
  pdf.setFontSize(10);
  pdf.text(`Designer: ${designer.name}`, 10, 20);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 10, 25);

  if (options.include_legend) {
    // Page 2: Legend
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Legend', 10, 10);

    // Zone types
    zoneTypes.forEach((type, i) => {
      pdf.setFillColor(type.color);
      pdf.rect(10, 20 + i * 10, 5, 5, 'F');
      pdf.text(type.label, 20, 24 + i * 10);
    });
  }

  if (options.include_species_list) {
    // Page 3: Species list
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.text('Species List', 10, 10);

    plantings.forEach((p, i) => {
      pdf.setFontSize(10);
      pdf.text(`${p.common_name} (${p.scientific_name})`, 10, 20 + i * 6);
    });
  }

  // Save to blob
  const pdfBlob = pdf.output('blob');

  // Upload to R2
  const pdfUrl = await uploadToR2(pdfBlob, `farms/${farmId}/exports/${Date.now()}.pdf`);

  return pdfUrl;
}
```

**3. GeoJSON Export**
```typescript
async function exportGeoJSON(farmId: string) {
  const zones = await db.getZones(farmId);
  const plantings = await db.getPlantings(farmId);
  const lines = await db.getLines(farmId);

  const features = [
    ...zones.map(z => ({
      type: 'Feature',
      geometry: JSON.parse(z.geometry),
      properties: {
        id: z.id,
        type: 'zone',
        label: z.label,
        zone_type: z.user_zone_type,
        phase: z.phase_id,
        // ... other properties
      }
    })),
    ...plantings.map(p => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.lng, p.lat]
      },
      properties: {
        id: p.id,
        type: 'planting',
        species: p.common_name,
        // ... other properties
      }
    })),
    ...lines.map(l => ({
      type: 'Feature',
      geometry: JSON.parse(l.geometry),
      properties: {
        id: l.id,
        type: 'line',
        line_type: l.line_type,
        // ... other properties
      }
    }))
  ];

  const geojson = {
    type: 'FeatureCollection',
    features
  };

  return geojson;
}
```

**4. Presentation Builder**
```typescript
// Record mode: Capture current view as slide
function addSlide() {
  const currentView = {
    center: map.getCenter().toArray(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch()
  };

  const newSlide: PresentationSlide = {
    id: crypto.randomUUID(),
    order: slides.length,
    camera: currentView,
    visible_layers: currentVisibleLayers,
    visible_phases: currentVisiblePhases,
    duration_seconds: 5,
    transition_duration_ms: 2000,
  };

  setSlides([...slides, newSlide]);
}
```

**5. Presentation Player**
```typescript
async function playPresentation(presentation: Presentation) {
  setFullscreen(true);

  for (const slide of presentation.slides) {
    // Set layer/phase visibility
    setVisibleLayers(slide.visible_layers);
    setVisiblePhases(slide.visible_phases);

    // Fly to camera position
    await map.flyTo({
      center: slide.camera.center,
      zoom: slide.camera.zoom,
      bearing: slide.camera.bearing,
      pitch: slide.camera.pitch,
      duration: slide.transition_duration_ms
    });

    // Show narration
    setNarration(slide.narration);

    // Wait for slide duration
    await new Promise(resolve => setTimeout(resolve, slide.duration_seconds * 1000));
  }

  setFullscreen(false);
}
```

#### Optional Enhancements (Nice-to-Have)

- **Auto-generate report:** Template-based document from annotations
- **Video export:** Record presentation as MP4 (MediaRecorder API)
- **Interactive web presentation:** Shareable link, no login required
- **KML export:** For Google Earth compatibility
- **Shapefile export:** Requires server-side processing (GDAL)

---

### Track 3 Success Criteria

**Acceptance Tests:**
1. Designer can invite landowner by email, landowner receives link, accepts collaboration
2. Landowner can add comment pin on map, designer sees notification
3. Designer can create 3 phases, assign zones to phases, filter map to show Phase 1 only
4. Designer can export design as PDF with legend and species list
5. Designer can create 5-slide presentation, play in full-screen mode
6. Activity feed shows "William added 3 zones" when collaborator makes changes

**Performance Benchmarks:**
- Comment creation instant (<200ms)
- Activity feed loads in <500ms
- Phase filter updates map in <100ms
- Image export completes in <3s for 4K image
- PDF generation completes in <10s for 10-page document
- Presentation slide transitions smooth (<60fps during fly-to)

---

## Track 4: Advanced Features

### Priority: POST-LAUNCH (nice-to-have)
### Features: Guild Builder + Offline Field Mode
### Complexity: High

---

### Feature 4A: Guild Builder

**Purpose:** Visual companion planting tool that recommends compatible species, auto-generates polyculture guild layouts, and provides mycorrhizal inoculation guidance.

#### Database Schema

```sql
CREATE TABLE guilds (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_species_id TEXT NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  layer_ids TEXT, -- JSON array
  phase_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_species_id) REFERENCES species(id),
  FOREIGN KEY (phase_id) REFERENCES implementation_phases(id)
);

CREATE TABLE guild_members (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  planting_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'primary' | 'nitrogen_fixer' | 'dynamic_accumulator' | 'pollinator' | 'pest_deterrent' | 'groundcover'
  distance_from_primary_feet REAL NOT NULL,
  angle_degrees REAL NOT NULL, -- 0-360
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
);

-- Extend species table
ALTER TABLE species ADD COLUMN guild_roles TEXT; -- JSON array: ["nitrogen_fixer", "pollinator"]
ALTER TABLE species ADD COLUMN compatible_with TEXT; -- JSON array of species IDs
ALTER TABLE species ADD COLUMN incompatible_with TEXT; -- JSON array of species IDs
ALTER TABLE species ADD COLUMN mycorrhizal_partners TEXT; -- JSON array of fungal species
ALTER TABLE species ADD COLUMN dynamic_accumulator_nutrients TEXT; -- JSON array: ["nitrogen", "phosphorus"]

CREATE INDEX idx_guilds_farm ON guilds(farm_id);
CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
```

#### TypeScript Interfaces

```typescript
interface Guild {
  id: string;
  farm_id: string;
  name: string;
  primary_species_id: string;
  center_lat: number;
  center_lng: number;
  layer_ids: string[];
  phase_id?: string;
  created_at: number;
}

interface GuildMember {
  id: string;
  guild_id: string;
  planting_id: string;
  role: 'primary' | 'nitrogen_fixer' | 'dynamic_accumulator' | 'pollinator' | 'pest_deterrent' | 'groundcover';
  distance_from_primary_feet: number;
  angle_degrees: number;
}

interface Species {
  // ... existing fields
  guild_roles: string[];
  compatible_with: string[];
  incompatible_with: string[];
  mycorrhizal_partners?: string[];
  dynamic_accumulator_nutrients?: string[];
}
```

#### API Routes

```
POST   /api/farms/[id]/guilds
  Body: { name, primary_species_id, center_lat, center_lng }
  Returns: Created guild

GET    /api/farms/[id]/guilds
  Returns: Array of guilds

GET    /api/guilds/[guildId]/recommendations
  Action: Get companion species suggestions for guild's primary species
  Returns: { nitrogen_fixers: [...], dynamic_accumulators: [...], pollinators: [...], groundcovers: [...] }

POST   /api/guilds/[guildId]/auto-place
  Body: { selected_companions: Species[] }
  Action: Auto-generate guild layout with proper spacing
  Returns: { plantings: [...], guild_members: [...] }

PATCH  /api/guilds/[guildId]/members
  Body: { members: GuildMember[] }
  Returns: Updated guild members

DELETE /api/guilds/[guildId]
  Action: Delete guild (keeps plantings, removes grouping)
  Returns: Success/error
```

#### UI Components

```
components/guild/
├── guild-builder-dialog.tsx
│   └─ Main guild creation wizard (multi-step)
│      Step 1: Select primary species
│      Step 2: Review recommended companions
│      Step 3: Choose companions
│      Step 4: Auto-place or manual positioning
│
├── primary-species-selector.tsx
│   └─ Search/filter for main tree/shrub
│      Show species with guild_roles defined
│
├── companion-recommendations.tsx
│   └─ List of suggested companions with rationale
│      Grouped by role (nitrogen fixers, pollinators, etc.)
│      Checkboxes to select which to include
│
├── guild-layout-preview.tsx
│   └─ Visual preview of guild spacing (SVG diagram)
│      Circles showing mature canopy sizes
│      Connection lines from primary to companions
│
├── guild-auto-place-tool.tsx
│   └─ "Auto-generate Layout" button
│      Algorithm places companions at optimal spacing
│
├── guild-member-editor.tsx
│   └─ Manual adjustment of spacing/position
│      Drag members, change distance/angle
│
├── guild-list-panel.tsx
│   └─ Manage existing guilds (bottom drawer tab)
│      List of guilds, edit/delete buttons
│
└── mycorrhizal-inoculation-info.tsx
    └─ Educational overlay
       Show mycorrhizal partners for species
       Link to MycoSymbiotics products
```

#### Implementation Notes

**1. Guild Creation Wizard**
```typescript
function GuildBuilderWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [primarySpecies, setPrimarySpecies] = useState(null);
  const [companions, setCompanions] = useState([]);

  // Step 1: Select primary
  // Step 2: Get recommendations
  // Step 3: Choose companions
  // Step 4: Auto-place

  async function handleAutoPlace() {
    const layout = await fetch(`/api/guilds/${guildId}/auto-place`, {
      method: 'POST',
      body: JSON.stringify({ selected_companions: companions })
    }).then(r => r.json());

    onComplete(layout);
  }
}
```

**2. Companion Recommendation Algorithm**
```typescript
async function getRecommendedCompanions(primarySpecies: Species) {
  // Get all species compatible with primary
  const allSpecies = await db.getAllSpecies();

  const compatible = allSpecies.filter(s =>
    primarySpecies.compatible_with.includes(s.id) &&
    !primarySpecies.incompatible_with.includes(s.id)
  );

  // Group by role
  return {
    nitrogen_fixers: compatible.filter(s => s.guild_roles.includes('nitrogen_fixer')),
    dynamic_accumulators: compatible.filter(s => s.guild_roles.includes('dynamic_accumulator')),
    pollinators: compatible.filter(s => s.guild_roles.includes('pollinator')),
    pest_deterrents: compatible.filter(s => s.guild_roles.includes('pest_deterrent')),
    groundcovers: compatible.filter(s => s.layer === 'groundcover'),
  };
}
```

**3. Auto-Placement Algorithm**
```typescript
function autoPlaceGuild(primary: Species, companions: Species[], centerLat: number, centerLng: number) {
  const placements: GuildMember[] = [];
  const primaryRadius = primary.mature_width_ft / 2;

  // Place nitrogen fixers at drip line (evenly spaced)
  const nFixers = companions.filter(s => s.guild_roles.includes('nitrogen_fixer'));
  const angleStep = 360 / nFixers.length;

  nFixers.forEach((species, i) => {
    const angle = i * angleStep;
    const distance = primaryRadius; // At drip line

    placements.push({
      id: crypto.randomUUID(),
      guild_id: guildId,
      planting_id: createPlanting(species, centerLat, centerLng, angle, distance),
      role: 'nitrogen_fixer',
      distance_from_primary_feet: distance,
      angle_degrees: angle
    });
  });

  // Place understory at 50% of canopy radius
  const understory = companions.filter(s => s.layer === 'understory');
  understory.forEach((species, i) => {
    const angle = (i * 360 / understory.length) + (angleStep / 2); // Offset from nFixers
    const distance = primaryRadius * 0.5;

    placements.push({
      id: crypto.randomUUID(),
      guild_id: guildId,
      planting_id: createPlanting(species, centerLat, centerLng, angle, distance),
      role: 'understory',
      distance_from_primary_feet: distance,
      angle_degrees: angle
    });
  });

  // Groundcovers fill gaps (scattered randomly within canopy)
  const groundcovers = companions.filter(s => s.layer === 'groundcover');
  groundcovers.forEach((species, i) => {
    const angle = Math.random() * 360;
    const distance = Math.random() * primaryRadius;

    placements.push({
      id: crypto.randomUUID(),
      guild_id: guildId,
      planting_id: createPlanting(species, centerLat, centerLng, angle, distance),
      role: 'groundcover',
      distance_from_primary_feet: distance,
      angle_degrees: angle
    });
  });

  return placements;
}

// Helper: Convert angle/distance to lat/lng
function createPlanting(species: Species, centerLat: number, centerLng: number, angleDegrees: number, distanceFeet: number) {
  const distanceMeters = distanceFeet * 0.3048;
  const bearing = angleDegrees;

  // Use Turf.js destination
  const point = turf.destination([centerLng, centerLat], distanceMeters / 1000, bearing);
  const [lng, lat] = point.geometry.coordinates;

  // Create planting in database
  return db.createPlanting({ species_id: species.id, lat, lng, planted_year: currentYear });
}
```

**4. Visual Guild Indicator on Map**
```typescript
// Draw circle around guild showing boundary
map.addSource(`guild-${guildId}`, {
  type: 'geojson',
  data: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [guild.center_lng, guild.center_lat]
    }
  }
});

map.addLayer({
  id: `guild-circle-${guildId}`,
  type: 'circle',
  source: `guild-${guildId}`,
  paint: {
    'circle-radius': primarySpecies.mature_width_ft / 2, // Meters to pixels conversion
    'circle-color': 'transparent',
    'circle-stroke-color': '#22c55e',
    'circle-stroke-width': 2,
    'circle-stroke-opacity': 0.6
  }
});

// Draw connection lines from primary to companions
guildMembers.forEach(member => {
  map.addLayer({
    id: `guild-connection-${member.id}`,
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [guild.center_lng, guild.center_lat],
            [member.planting.lng, member.planting.lat]
          ]
        }
      }
    },
    paint: {
      'line-color': '#22c55e',
      'line-width': 1,
      'line-dasharray': [2, 2],
      'line-opacity': 0.3
    }
  });
});
```

**5. Mycorrhizal Integration**
```typescript
// Show mycorrhizal info in species details
function SpeciesDetail({ species }: { species: Species }) {
  return (
    <div>
      <h3>{species.common_name}</h3>

      {species.mycorrhizal_partners && (
        <div className="mt-4">
          <h4>Mycorrhizal Partners</h4>
          <ul>
            {species.mycorrhizal_partners.map(partner => (
              <li key={partner}>
                {partner}
                <a href={`https://mycosymbiotics.com/products/${partner}`} target="_blank">
                  Buy Inoculant →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

#### Optional Enhancements (Nice-to-Have)

- **Succession planning:** Pioneer species → climax species over time
- **Guild templates:** Pre-designed guilds users can copy ("Three Sisters", "Chestnut Guild")
- **Guild health scoring:** Based on diversity, roles filled, spacing
- **Shopping list export:** Export guild as order form with quantities
- **3D visualization:** Mature guild canopy stacking (WebGL)

---

### Feature 4B: Offline Field Mode

**Purpose:** Enable using the map editor on-site without internet by caching tiles, project data, and syncing offline edits when connectivity restored.

#### Database Schema

```sql
CREATE TABLE offline_cache (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tile_cache_bounds TEXT NOT NULL, -- JSON: { north, south, east, west }
  zoom_levels TEXT NOT NULL, -- JSON array: [14, 15, 16, 17, 18]
  tile_count INTEGER NOT NULL,
  cache_size_bytes INTEGER NOT NULL,
  cached_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL, -- Auto-refresh every 30 days
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE offline_edits (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK(edit_type IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL CHECK(entity_type IN ('zone', 'planting', 'line', 'comment', 'annotation')),
  entity_data TEXT NOT NULL, -- JSON of the change
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  synced INTEGER NOT NULL DEFAULT 0, -- Boolean
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_offline_cache_farm ON offline_cache(farm_id);
CREATE INDEX idx_offline_edits_farm_synced ON offline_edits(farm_id, synced);
```

#### TypeScript Interfaces

```typescript
interface OfflineCache {
  id: string;
  farm_id: string;
  user_id: string;
  tile_cache_bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom_levels: number[];
  tile_count: number;
  cache_size_bytes: number;
  cached_at: number;
  expires_at: number;
}

interface OfflineEdit {
  id: string;
  farm_id: string;
  user_id: string;
  edit_type: 'create' | 'update' | 'delete';
  entity_type: 'zone' | 'planting' | 'line' | 'comment' | 'annotation';
  entity_data: any; // JSON
  timestamp: number;
  synced: boolean;
}
```

#### API Routes

```
POST   /api/farms/[id]/offline/prepare
  Body: { bounds?, zoom_levels? }
  Action: Calculates tiles needed, returns list of URLs to cache
  Returns: { tile_urls: string[], estimated_size_bytes: number }

GET    /api/farms/[id]/offline/status
  Returns: { cache: OfflineCache | null, pending_edits: number }

POST   /api/farms/[id]/offline/sync
  Body: { edits: OfflineEdit[] }
  Action: Validates and applies offline edits to server
  Returns: { synced_count: number, conflicts: [...] }

DELETE /api/farms/[id]/offline/cache
  Action: Clear cached data (client-side IndexedDB)
  Returns: Success/error
```

#### UI Components

```
components/offline/
├── offline-mode-toggle.tsx
│   └─ Toggle switch in settings
│      Enable/disable offline mode
│
├── offline-cache-dialog.tsx
│   └─ Configure cache settings
│      Select bounds (current view, entire farm, custom)
│      Select zoom levels (14-18)
│      Show estimated size
│
├── offline-sync-status.tsx
│   └─ Status indicator
│      "5 changes pending sync"
│      Green = synced, Yellow = pending, Red = conflict
│
├── offline-sync-button.tsx
│   └─ Manual sync trigger
│      "Sync Now" button
│      Progress: "Syncing 3/5 changes..."
│
├── offline-conflict-resolver.tsx
│   └─ Handle sync conflicts
│      Show conflicting changes (yours vs server)
│      Choose: Keep mine, Keep server's, Merge
│
└── offline-storage-meter.tsx
    └─ Show cache size usage
       "Using 150MB of 500MB available"
       Clear cache button
```

#### Implementation Notes

**1. Service Worker Setup**
```typescript
// public/service-worker.js
const CACHE_VERSION = 'v1';
const TILE_CACHE = `farm-tiles-${CACHE_VERSION}`;
const DATA_CACHE = `farm-data-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(TILE_CACHE).then((cache) => {
      // Tiles will be added dynamically
      return cache;
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache tile requests
  if (url.hostname.includes('arcgisonline.com') || url.hostname.includes('r2.domain.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(TILE_CACHE).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }

  // Cache API requests
  if (url.pathname.startsWith('/api/farms')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, return cached version
        return caches.match(event.request);
      })
    );
  }
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

**2. Tile Pre-Caching**
```typescript
async function cacheTilesForFarm(farmId: string, bounds: Bounds, zoomLevels: number[]) {
  // Calculate tile URLs
  const tiles = getTilesForBounds(bounds, zoomLevels);

  // Open cache
  const cache = await caches.open('farm-tiles-v1');

  // Download and cache tiles with progress
  let cached = 0;
  for (const tile of tiles) {
    const response = await fetch(tile.url);
    await cache.put(tile.url, response);
    cached++;

    // Update progress
    updateProgress(cached / tiles.length);
  }

  // Save cache metadata
  await db.createOfflineCache({
    farm_id: farmId,
    tile_cache_bounds: bounds,
    zoom_levels: zoomLevels,
    tile_count: tiles.length,
    cache_size_bytes: await getCacheSize('farm-tiles-v1'),
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

function getTilesForBounds(bounds: Bounds, zoomLevels: number[]) {
  const tiles = [];

  zoomLevels.forEach(z => {
    const nwTile = lngLatToTile(bounds.west, bounds.north, z);
    const seTile = lngLatToTile(bounds.east, bounds.south, z);

    for (let x = nwTile.x; x <= seTile.x; x++) {
      for (let y = nwTile.y; y <= seTile.y; y++) {
        tiles.push({
          z, x, y,
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
        });
      }
    }
  });

  return tiles;
}
```

**3. Offline Data Storage (IndexedDB)**
```typescript
import { openDB } from 'idb';

const db = await openDB('farm-offline-db', 1, {
  upgrade(db) {
    db.createObjectStore('zones', { keyPath: 'id' });
    db.createObjectStore('plantings', { keyPath: 'id' });
    db.createObjectStore('lines', { keyPath: 'id' });
    db.createObjectStore('offline-edits', { keyPath: 'id' });
  }
});

// Download farm data to IndexedDB on entering offline mode
async function cacheFarmData(farmId: string) {
  const zones = await fetch(`/api/farms/${farmId}/zones`).then(r => r.json());
  const plantings = await fetch(`/api/farms/${farmId}/plantings`).then(r => r.json());
  const lines = await fetch(`/api/farms/${farmId}/lines`).then(r => r.json());

  const tx = db.transaction(['zones', 'plantings', 'lines'], 'readwrite');

  zones.forEach(z => tx.objectStore('zones').put(z));
  plantings.forEach(p => tx.objectStore('plantings').put(p));
  lines.forEach(l => tx.objectStore('lines').put(l));

  await tx.done;
}

// Read from IndexedDB when offline
async function getZonesOffline() {
  return await db.getAll('zones');
}
```

**4. Offline Editing**
```typescript
// When offline, save edits to offline-edits table
async function createZoneOffline(zoneData) {
  // Create zone in IndexedDB
  const zone = { ...zoneData, id: crypto.randomUUID() };
  await db.put('zones', zone);

  // Log offline edit
  await db.put('offline-edits', {
    id: crypto.randomUUID(),
    farm_id: zone.farm_id,
    user_id: currentUserId,
    edit_type: 'create',
    entity_type: 'zone',
    entity_data: zone,
    timestamp: Date.now(),
    synced: false
  });

  // Update UI optimistically
  updateZonesDisplay();
}
```

**5. Sync When Back Online**
```typescript
// Detect online/offline state
window.addEventListener('online', () => syncOfflineEdits());
window.addEventListener('offline', () => showOfflineMode());

async function syncOfflineEdits() {
  const edits = await db.getAllFromIndex('offline-edits', 'synced', 0); // Unsynced only

  if (edits.length === 0) return;

  try {
    const response = await fetch(`/api/farms/${farmId}/offline/sync`, {
      method: 'POST',
      body: JSON.stringify({ edits })
    });

    const result = await response.json();

    // Mark synced edits
    for (const edit of edits) {
      await db.put('offline-edits', { ...edit, synced: true });
    }

    // Handle conflicts
    if (result.conflicts.length > 0) {
      showConflictResolver(result.conflicts);
    }

    toast({ title: `Synced ${result.synced_count} changes` });
  } catch (error) {
    console.error('Sync failed:', error);
    toast({ title: 'Sync failed', description: 'Will retry later' });
  }
}
```

**6. Storage Management**
```typescript
// Show storage usage
async function getCacheSize(cacheName: string) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  let totalSize = 0;
  for (const request of keys) {
    const response = await cache.match(request);
    const blob = await response.blob();
    totalSize += blob.size;
  }

  return totalSize;
}

// Clear cache
async function clearOfflineCache() {
  await caches.delete('farm-tiles-v1');
  await db.clear('zones');
  await db.clear('plantings');
  await db.clear('lines');
  // Keep offline-edits until synced
}
```

#### Optional Enhancements (Nice-to-Have)

- **Offline photo capture:** Store photos locally, upload when online
- **Selective caching:** Only cache specific layers/phases
- **Offline AI chat:** Fallback to cached knowledge base
- **Multi-device sync:** Detect edits from other devices on reconnect
- **Smart conflict resolution:** Merge non-overlapping edits automatically

---

### Track 4 Success Criteria

**Acceptance Tests:**
1. Designer can create chestnut guild, get recommended companions (nitrogen fixers, pollinators)
2. Designer can auto-place guild with 5 species at proper spacing
3. Designer can view mycorrhizal partner info for chestnut, click link to buy inoculant
4. Designer can enable offline mode, cache 100 tiles for farm area
5. Designer can create 3 zones while offline, edits saved to IndexedDB
6. Designer reconnects, offline edits sync to server without conflicts

**Performance Benchmarks:**
- Guild recommendations load in <500ms
- Auto-place algorithm completes in <1s for 10-species guild
- Tile caching downloads 100 tiles in <30s (satellite imagery)
- Offline edits save to IndexedDB in <50ms (instant feedback)
- Sync uploads 10 offline edits in <2s
- Cache storage uses <500MB for typical farm (zoom 14-18)

---

## Cross-Track Integration

### Shared Data Model

All tracks extend the same core entities:

```
Core Entities:
- farms, users, zones, plantings, lines (Track 2 creates)

Track 1 Extensions:
- annotations (attach to any entity)
- design_layers (organize entities)

Track 2 Extensions:
- lines (new entity type)
- water_properties, catchment_properties, swale_properties (extend zones/lines)
- custom_imagery (new base map source)

Track 3 Extensions:
- farm_collaborators (multi-user access)
- map_comments (spatial feedback)
- implementation_phases (timeline organization)
- activity_log (change tracking)

Track 4 Extensions:
- guilds, guild_members (planting grouping)
- offline_cache, offline_edits (offline support)
```

### UI Integration

**Bottom Drawer Tabs:**
```
Existing:
- Zones
- Plantings
- Filters

Track 1 Adds:
- Details (annotations)
- Layers (design layer toggle)

Track 3 Adds:
- Comments (spatial feedback)
- Phases (implementation timeline)
- Activity (change log)

Track 4 Adds:
- Guilds (companion planting)
```

**Map Control Panel (Top-Right):**
```
Existing:
- Base map selector
- Grid settings

Track 1 Adds:
- Design layer visibility toggles

Track 2 Adds:
- Custom imagery selector

Track 3 Adds:
- Phase filter slider
```

**Drawing Toolbar (Right Side):**
```
Existing:
- Polygon
- Circle
- Point

Track 2 Adds:
- Line (polyline)
- Flow Arrow (water)

Track 3 Adds:
- Comment Pin (collaboration)
```

### API Architecture

All tracks follow consistent patterns:

**Route Structure:**
```
/api/farms/[id]/zones              (existing)
/api/farms/[id]/plantings          (existing)
/api/farms/[id]/annotations        (Track 1)
/api/farms/[id]/layers             (Track 1)
/api/farms/[id]/lines              (Track 2)
/api/farms/[id]/water/*            (Track 2)
/api/farms/[id]/imagery/*          (Track 2)
/api/farms/[id]/collaborators      (Track 3)
/api/farms/[id]/comments           (Track 3)
/api/farms/[id]/phases             (Track 3)
/api/farms/[id]/guilds             (Track 4)
/api/farms/[id]/offline/*          (Track 4)
```

**Shared Middleware:**
- Authentication (all routes)
- Permission checks (Track 3 collaborator roles)
- Activity logging (Track 3 activity feed)
- Offline sync validation (Track 4)

### Database Migrations

Sequential numbering prevents conflicts:

```
Existing:
001_initial_schema.sql
002_zones_plantings.sql
...
010_fix_image_generation_model.sql

Track 1:
011_annotations.sql
012_design_layers.sql
013_extend_zones_layers.sql

Track 2:
014_lines.sql
015_water_properties.sql
016_custom_imagery.sql

Track 3:
017_farm_collaborators.sql
018_map_comments.sql
019_implementation_phases.sql
020_activity_log.sql
021_extend_farms_visibility.sql

Track 4:
022_guilds.sql
023_extend_species_guild_data.sql
024_offline_cache.sql
```

Each track maintains its own migrations, applied in order.

---

## Implementation Strategy

### Development Order (by Track)

**Track 1: Annotation System**
1. Build annotation data model + API routes
2. Create annotation panel UI (extend bottom drawer)
3. Implement rich text editor (Tiptap)
4. Add media upload (R2 integration)
5. Build design layer toggle UI
6. Implement layer filtering in MapLibre
7. Test integration with zones/plantings

**Track 2: Drawing & Water System**
1. Implement line/polyline drawing (MapboxDraw integration)
2. Add line styling UI (color, width, dash, arrows)
3. Build water property extensions (catchment, swale)
4. Create water calculation APIs
5. Implement custom imagery upload (R2 + tiling)
6. Build imagery alignment UI
7. Test water toolkit with real scenarios

**Track 3: Collaboration & Presentation**
1. Build collaborator invitation flow (email + magic link)
2. Implement permission system (roles + middleware)
3. Create comment pins on map
4. Build activity log + notifications
5. Implement phasing data model + UI
6. Integrate phasing with Time Machine
7. Build export (image, PDF, GeoJSON)
8. Create presentation builder + player
9. Test multi-user workflows

**Track 4: Advanced Features**
1. Extend species data model (guild roles, compatibility)
2. Build guild recommendation algorithm
3. Implement auto-place algorithm
4. Create guild builder wizard
5. Set up service worker + IndexedDB
6. Implement tile pre-caching
7. Build offline edit queue + sync
8. Test offline mode in field conditions

### Testing Strategy

**Unit Tests:**
- API route handlers (input validation, authorization)
- Calculation functions (catchment, swale volume, guild placement)
- Data transformations (GeoJSON, filtering)

**Integration Tests:**
- End-to-end API flows (create annotation → upload media → retrieve)
- MapLibre layer rendering (correct filters, styling)
- Offline sync (edits applied in correct order, conflicts resolved)

**E2E Tests (Manual):**
- Complete William's workflow (Track 1-3)
- Offline mode on actual property with poor coverage (Track 4)
- Export PDF and verify formatting (Track 3)
- Multi-user collaboration (Track 3)

### Deployment Strategy

**Incremental Rollout:**
1. Deploy Track 1 to staging → test with William → production
2. Deploy Track 2 to staging → test water design → production
3. Deploy Track 3 to staging → test collaboration → production
4. Deploy Track 4 to staging → test in field → production

**Feature Flags:**
```typescript
const FEATURES = {
  annotations: process.env.NEXT_PUBLIC_FEATURE_ANNOTATIONS === 'true',
  design_layers: process.env.NEXT_PUBLIC_FEATURE_DESIGN_LAYERS === 'true',
  water_toolkit: process.env.NEXT_PUBLIC_FEATURE_WATER_TOOLKIT === 'true',
  custom_imagery: process.env.NEXT_PUBLIC_FEATURE_CUSTOM_IMAGERY === 'true',
  collaboration: process.env.NEXT_PUBLIC_FEATURE_COLLABORATION === 'true',
  phasing: process.env.NEXT_PUBLIC_FEATURE_PHASING === 'true',
  guilds: process.env.NEXT_PUBLIC_FEATURE_GUILDS === 'true',
  offline: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === 'true',
};
```

Enable features progressively for testing before general availability.

---

## Success Criteria (Overall)

### William's End-to-End Workflow

The platform succeeds if William can complete this workflow without leaving the application:

1. ✅ **Opens the project** - Daniel created farm, uploaded drone imagery
2. ✅ **Reads the land** - Toggle topo contours, use 3D terrain to visualize elevation
3. ✅ **Designs water system** - Create "Water Systems" layer, draw swale lines, place catchment zones with auto-calculated capture, draw flow arrows, write design rationale on each element
4. ✅ **Lays out nursery** - Create "Nursery" layer, draw nursery beds, use bulk planting to fill beds, attach mycorrhizal partner data
5. ✅ **Phases implementation** - Tag everything Phase 1/2/3, preview with Time Machine
6. ✅ **Collaborates with Daniel** - Daniel drops comment pins with local knowledge, William responds and adjusts
7. ✅ **Presents and exports** - Use presentation mode for filming, export PDF for grant report

**If all 7 steps work seamlessly, the design is validated.**

### Performance Targets

- Annotation panel opens in <200ms
- Layer visibility toggle updates map in <100ms
- Catchment calculation instant (<100ms)
- Custom imagery upload completes in <10s for 25MB file
- Comment creation instant (<200ms)
- Phase filter updates map in <100ms
- PDF generation completes in <10s
- Offline sync uploads 10 edits in <2s

### User Experience Targets

- **Intuitive UX:** New users find features without documentation (clear labels, tooltips, logical placement)
- **Intuitive Implementation:** Developers can extend features following established patterns (consistent API routes, shared UI components, predictable data model)
- **No Dead Ends:** Every action has clear next steps (create zone → add annotation → assign to layer → tag phase)
- **Forgiveness:** Undo/redo, draft saves, conflict resolution (don't lose work)

---

## Next Steps

1. **Approve this design document**
2. **Invoke writing-plans skill** to create detailed implementation plans for each track
3. **Begin Track 1 implementation** (Annotation System - highest priority)
4. **Test with William** at each track milestone
5. **Iterate based on feedback**

---

**Design Status:** ✅ Complete - Ready for implementation planning
**Last Updated:** February 13, 2026
**Maintained By:** Claude Code
