# Feature Manager Design

**Created**: 2026-02-15
**Status**: Approved
**Implementation**: Track 5 - Feature Manager Tab

---

## Problem Statement

As farm designs grow to 50+ zones, plantings, lines, and guilds, the map becomes cluttered and navigation becomes difficult. Users need:

1. **Navigation** - Find specific features when the map is crowded
2. **Organization** - See all features grouped by type/layer/phase for high-level understanding
3. **Smart Search** - Find features by name, species, properties, or functions

**Current gaps**:
- No comprehensive feature list
- Only way to access features: click on map (hard when cluttered)
- Filters exist but don't show actual feature lists
- No search functionality

---

## Solution: Feature Manager Tab

Add a new "Features" tab to the existing MapBottomDrawer component (alongside Legend, Filters, Vitals, Settings).

**Key capabilities**:
- Browse all farm features in organized lists
- Search across names, species, properties, functions
- Switch between Type/Layer/Phase grouping views
- Click feature → pan map + open details drawer
- Responsive: works on mobile and desktop

---

## Architecture & Integration

### Component Structure

```
MapBottomDrawer
├─ Tab Bar: [Legend] [Filters] [Vitals] [Features ✨] [Settings]
└─ Tab Content:
   └─ FeatureListPanel (new component)
      ├─ Search Bar (smart search with debounce)
      ├─ View Tabs: [By Type] [By Layer] [By Phase]
      └─ Scrollable Feature List
         ├─ Collapsible Groups
         │  ├─ 📐 Zones (12) [expanded/collapsed]
         │  │  └─ Zone 1: Kitchen Garden
         │  │  └─ Zone 2: Food Forest
         │  ├─ 🌱 Plantings (47)
         │  ├─ 〰️ Lines (8)
         │  └─ ✨ Guilds (3)
         └─ Empty State (when no features)
```

### Data Flow

1. `ImmersiveMapEditor` fetches all features (zones, plantings, lines, guilds, phases) on mount
2. Passes features as props to `MapBottomDrawer`
3. `FeatureListPanel` receives features, applies current view filter (Type/Layer/Phase)
4. Search input filters the displayed list in real-time
5. Clicking a feature calls `onFeatureSelect(id, type)` → pans map + opens details drawer

### Integration Points

- **Uses existing `onFeatureSelect` callback** (already implemented for click-to-view)
- **Uses existing feature data sources** (zones, plantings, lines already loaded for map rendering)
- **Leverages existing drawer expand/collapse mechanics**
- **No new API endpoints needed** (all data already fetched)

---

## Components & UI Design

### Search Bar

- Fixed at top of Features tab content
- Placeholder: "Search features..." with 🔍 icon
- Debounced input (300ms delay to avoid lag)
- Shows result count when searching: "12 results for 'apple'"
- Clear button (×) appears when text entered

### View Tabs

Horizontal tabs below search bar:
```
[By Type] [By Layer] [By Phase]
```

- Active tab highlighted with primary color underline
- Switches grouping logic without losing search filter
- Preference persisted in local storage

### Feature List Items

```
┌─────────────────────────────────────┐
│ 🌳 Apple Tree (Malus domestica)     │ ← Icon + Name (+ Scientific name if planting)
│    Zone 1 · Canopy · Year 1         │ ← Metadata (zone, layer, phase)
└─────────────────────────────────────┘
```

**Design details**:
- **Hover state**: Light background highlight
- **Click**: Entire row clickable
- **Icons**:
  - 📐 Zones
  - 🌱 Plantings (or layer-specific: 🌳 canopy, 🌿 understory, 🪴 shrub)
  - 〰️ Lines
  - ✨ Guilds
  - 📅 Phases
- **Metadata**: Small gray text showing context (location, layer, timeline)
- **Truncation**: Long names truncate with ellipsis, show full name on hover tooltip

### Collapsible Groups

```
▼ 🌱 Plantings (47)              ← Chevron + icon + count
  └─ Apple Tree (Malus...)        ← Indented items
  └─ Comfrey (Symphytum...)

► 📐 Zones (12)                  ← Collapsed state (items hidden)
```

- Click group header to expand/collapse
- All groups expanded by default when switching views
- Collapse state persisted per view (Type/Layer/Phase)

### Empty States

- **No features**: "No features yet. Use the FAB to add zones, plantings, or lines."
- **No search results**: "No features match 'xyz'. Try different keywords."

---

## Smart Search Implementation

### Search Algorithm

Case-insensitive substring matching across multiple fields.

### Searchable Fields by Feature Type

**Zones**:
- Name (e.g., "Kitchen Garden")
- Zone type (e.g., "zone_1", "food_forest")
- Notes/annotations

**Plantings**:
- Common name (e.g., "Apple Tree")
- Scientific name (e.g., "Malus domestica")
- Species functions (e.g., "nitrogen_fixer", "pollinator_support", "edible_fruit")
- Layer (e.g., "canopy", "understory")
- Notes/annotations

**Lines**:
- Name/label (e.g., "Swale #1")
- Line type (e.g., "swale", "fence", "flow_path")
- Notes/annotations

**Guilds**:
- Guild name
- Focal species name
- Companion species names

**Phases**:
- Phase name (e.g., "Year 1 - Foundation")
- Description

### Search Examples

```
"apple"        → Finds: Apple Tree plantings, Apple Guild, Orchard zones
"nitrogen"     → Finds: All plantings with nitrogen_fixer function
"zone 1"       → Finds: Zone 1 features + plantings assigned to Zone 1
"swale"        → Finds: Swale lines + swale zones
"canopy"       → Finds: All canopy layer plantings
"2025"         → Finds: Features in Year 2025 phase
```

### Search Behavior

- Real-time filtering (300ms debounce)
- Highlights matching groups (expands them automatically)
- Collapses non-matching groups
- Search persists when switching view tabs
- Case-insensitive
- Matches partial words ("app" matches "apple")

### Performance

- Client-side filtering (all features already loaded)
- No API calls during search
- Max ~500 features before considering virtualization
- Debounce prevents lag on typing

### Scope

**No advanced syntax** (YAGNI):
- No regex, no boolean operators (AND/OR)
- Just simple substring matching
- Can add later if needed

---

## Data Structure & Grouping Logic

### View 1: By Type (Default)

Groups features by their entity type.

```typescript
{
  "Zones": [
    { id: "z1", name: "Kitchen Garden", zone_type: "zone_1", ... },
    { id: "z2", name: "Food Forest", zone_type: "zone_2", ... }
  ],
  "Plantings": [
    { id: "p1", common_name: "Apple Tree", scientific_name: "Malus domestica", ... },
    { id: "p2", common_name: "Comfrey", ... }
  ],
  "Lines": [...],
  "Guilds": [...],
  "Phases": [...]
}
```

**Sorting within groups**:
- Zones: By name alphabetically
- Plantings: By common_name alphabetically
- Lines: By label/name alphabetically
- Guilds: By guild name alphabetically
- Phases: By chronological order (start_year)

---

### View 2: By Layer

Groups plantings by their permaculture design layer. Non-planting features appear in "Other Features" group.

```typescript
{
  "Canopy": [plantings with layer="canopy"],
  "Understory": [plantings with layer="understory"],
  "Shrub": [plantings with layer="shrub"],
  "Herbaceous": [plantings with layer="herbaceous"],
  "Groundcover": [plantings with layer="groundcover"],
  "Vine": [plantings with layer="vine"],
  "Root": [plantings with layer="root"],
  "Other Features": [zones, lines, guilds, phases]
}
```

**Handling missing data**: Plantings without layer → "Unassigned" group at bottom

---

### View 3: By Phase

Groups features by their associated implementation timeline phase.

```typescript
{
  "Year 1 - Foundation": [features with phase_id matching "phase1"],
  "Year 2-3 - Establishment": [features with phase_id matching "phase2"],
  "Year 5+ - Maturity": [features with phase_id matching "phase3"],
  "Unscheduled": [features with no phase_id]
}
```

**Phase assignment**:
- Zones: Can have phase_id (when planned for specific timeline)
- Plantings: Have planted_year → map to phase based on year range
- Lines: Can have phase_id (e.g., swales built in Year 1)
- Guilds: Phase based on focal species planted_year

**Fallback**: Features without phase assignment go to "Unscheduled" group

---

### Group Counts

- Show total count in header: "🌱 Plantings (47)"
- Update dynamically when search filters results: "🌱 Plantings (3 of 47)"

---

## Interaction Behavior

### Primary Action: Click Feature Item

When user clicks a feature in the list:

1. **Map pans** to center the feature
   - Smooth animation (500ms easing)
   - Zoom level adjusts if needed (zoom to fit feature bounds + padding)
   - For point features (plantings): center on point
   - For polygon features (zones): center on centroid
   - For line features: center on midpoint

2. **Feature highlights** on map
   - Temporary pulse effect (2 seconds)
   - Increase opacity/stroke width briefly
   - Similar to click-on-map behavior (already implemented)

3. **Bottom drawer switches content**
   - Features tab content → Details drawer content
   - AnnotationPanel opens with feature details
   - Same drawer height behavior as current implementation (medium height)
   - Drawer stays open (doesn't collapse)

4. **Feature selection state updates**
   - `selectedFeature` state set to clicked feature
   - MapboxDraw deselects any selected features (prevents conflicts)
   - Detail panel shows delete button, comments, annotations

### Flow Diagram

```
User clicks "Apple Tree" in list
  ↓
Map.flyTo(appleLngLat) [500ms animation]
  ↓
Highlight apple tree marker [2s pulse]
  ↓
setSelectedFeature({ id: "p1", type: "planting" })
  ↓
openDrawer('details', 'medium')
  ↓
Drawer shows: AnnotationPanel for Apple Tree
```

### Edge Cases

- **Feature outside current view**: Map pans to bring it into view (expected behavior)
- **Feature deleted**: Show toast error "Feature not found" if click fails
- **Multiple features with same name**: Each has unique ID, clicking navigates to correct one
- **Drawer already showing different feature**: Smoothly transitions to new feature details
- **Mobile keyboard open (search)**: Close keyboard before panning map

### Responsive Differences

- **Desktop**: Map pan + drawer update happen simultaneously
- **Mobile**: Same behavior, but drawer slides up from bottom (existing drawer mechanics)

---

## Implementation Details

### New Files

```
components/map/feature-list-panel.tsx  (main component)
lib/map/feature-search.ts              (search utility functions)
lib/map/feature-grouping.ts            (grouping logic for Type/Layer/Phase)
```

### Modified Files

```
components/map/map-bottom-drawer.tsx   (add Features tab)
components/immersive-map/immersive-map-editor.tsx  (pass features data)
```

### Component Interface

```typescript
// feature-list-panel.tsx
interface FeatureListPanelProps {
  zones: Zone[];
  plantings: Planting[];
  lines: Line[];
  guilds: GuildTemplate[];
  phases: Phase[];
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<maplibregl.Map>; // For panning
}
```

### State Management

```typescript
// Inside FeatureListPanel component
const [searchQuery, setSearchQuery] = useState('');
const [activeView, setActiveView] = useState<'type' | 'layer' | 'phase'>('type');
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
```

### Key Functions

```typescript
// lib/map/feature-search.ts
export function searchFeatures(features: AllFeatures, query: string): FilteredFeatures

// lib/map/feature-grouping.ts
export function groupByType(features: AllFeatures): GroupedFeatures
export function groupByLayer(features: AllFeatures): GroupedFeatures
export function groupByPhase(features: AllFeatures, phases: Phase[]): GroupedFeatures
```

### Pan-to-Feature Logic

```typescript
const handleFeatureClick = (featureId: string, featureType: string) => {
  // 1. Get feature coordinates
  const coords = getFeatureCoordinates(featureId, featureType, allFeatures);

  // 2. Pan map
  if (mapRef.current && coords) {
    mapRef.current.flyTo({
      center: coords,
      zoom: 18, // Or feature-appropriate zoom
      duration: 500
    });
  }

  // 3. Open details
  onFeatureSelect(featureId, featureType);
};
```

### Accessibility

- Search input has `aria-label="Search features"`
- Feature list uses semantic `<ul>` with `role="list"`
- Each feature item is keyboard navigable (Tab/Enter)
- Group headers are `<button>` elements for keyboard expand/collapse
- Focus management: clicking feature doesn't lose keyboard focus

### Performance

- Search debounced at 300ms
- Groups render only visible items (no virtualization needed for <500 features)
- Local storage caches: active view preference, expanded groups state
- Feature data already loaded (no additional API calls)

### Testing Strategy

- **Unit tests**: search functions, grouping logic
- **Integration tests**: click feature → map pans + drawer opens
- **Manual testing**: Large farms (100+ features), search performance, mobile gestures

---

## Success Criteria

**Feature is successful when**:

1. ✅ Users can find any feature by name or property in <3 seconds (via search)
2. ✅ Users can browse features organized by Type/Layer/Phase
3. ✅ Clicking a feature pans map and opens details (same as map click)
4. ✅ Search performs well with 100+ features (no lag)
5. ✅ Mobile and desktop experiences are equally usable
6. ✅ No new API endpoints required (uses existing data)

---

## Future Enhancements (Out of Scope)

- Bulk actions (delete multiple, assign to phase)
- Drag-to-reorder features
- Export feature list as CSV/PDF
- Feature statistics (total area, plant count by function)
- Custom groupings (by user-defined tags)
- Advanced search syntax (boolean operators, filters)

---

## Notes

- Integrates with existing immersive map editor architecture
- Reuses MapBottomDrawer infrastructure (no new panel system)
- Search is client-side (fast, no server dependency)
- Grouping logic is pure functions (testable, maintainable)
- Responsive design handled by existing drawer mechanics

---

*Design approved 2026-02-15*
