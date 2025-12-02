# Native Species Index & Planting System Design

**Date:** 2025-12-02
**Status:** Approved for Implementation
**Author:** User & Claude (Brainstorming Session)

## Overview

Design for a comprehensive native species catalog and planting system that prioritizes native plants while allowing custom non-native additions. Educational focus with permaculture depth, integrated with AI recommendations and map-based planting workflow.

## Core Principles

1. **Native-first approach**: Native species always appear first, clearly marked
2. **Educational depth**: Permaculture functions, companion plants, zone placement, sourcing
3. **Flexibility**: Users can add custom non-native plants when needed
4. **AI integration**: Species data feeds AI recommendations for better suggestions
5. **Community growth**: Database improves through AI generation, usage analytics, and community contributions

## Database Schema

### Species Table Enhancements

Add to existing `species` table:

```sql
ALTER TABLE species ADD COLUMN permaculture_functions TEXT; -- JSON array: ["nitrogen_fixer", "wildlife_habitat", "erosion_control", "dynamic_accumulator"]
ALTER TABLE species ADD COLUMN companion_plants TEXT; -- JSON array of species IDs or common names
ALTER TABLE species ADD COLUMN zone_placement_notes TEXT; -- "Excellent for Zone 1-2, tolerates Zone 3"
ALTER TABLE species ADD COLUMN edible_parts TEXT; -- JSON: {"fruit": "late summer", "leaves": "spring"}
ALTER TABLE species ADD COLUMN sourcing_notes TEXT; -- "Available at most native nurseries in Northeast"
ALTER TABLE species ADD COLUMN broad_regions TEXT; -- JSON: ["Northeast", "Southeast", "Midwest"]
ALTER TABLE species ADD COLUMN min_hardiness_zone TEXT; -- "3"
ALTER TABLE species ADD COLUMN max_hardiness_zone TEXT; -- "8"
ALTER TABLE species ADD COLUMN min_rainfall_inches REAL; -- 30
ALTER TABLE species ADD COLUMN max_rainfall_inches REAL; -- 50
ALTER TABLE species ADD COLUMN ai_generated INTEGER DEFAULT 0; -- Track AI-generated content
```

### Native Matching Criteria

For each farm, calculate match levels:

- **Perfect Match**: `is_native = 1` AND hardiness zone in range AND broad region matches
- **Good Match**: `is_native = 1` AND (hardiness zone in range OR region matches)
- **Possible**: `is_native = 0` AND hardiness zone in range (naturalized/common permaculture plants)
- **Custom**: User-added species

## User Interface Structure

### 1. Global Plants Catalog (`/app/plants`)

Browseable species library accessible from top navigation.

**Features:**
- Filter sidebar: Native status, layer, hardiness zones, permaculture functions
- Search bar: Common name, scientific name, functions
- Grid/list view toggle
- Species cards: Thumbnail, common/scientific name, native badge, regions
- Sort: Alphabetical, layer, popularity

### 2. Farm-Contextual Browser

Panel/modal inside farm editor accessed via "Browse Native Plants for This Farm" button.

**Features:**
- Auto-filtered to farm's hardiness zone + location
- Tabbed sections:
  - Perfect Match (native + zone + region)
  - Good Match (native + zone OR region)
  - All Plants (full catalog)
  - My Custom Plants (user-added)
- Quick actions: "Learn More", "Add to Map"

### 3. Species Detail View

Full-screen or modal with comprehensive information.

**Sections:**
- Header: Photo, common name, scientific name, native badge
- Quick Stats: Layer, mature size, hardiness zones, sun/water requirements
- Permaculture Section:
  - Functions (nitrogen fixer, wildlife habitat, etc.)
  - Companion plants (links to other species)
  - Zone placement recommendations (Zone 1 vs Zone 3)
  - Edible parts and harvest timing
- Sourcing: Text field with nursery recommendations
- Action: "Add This Plant to My Farm" button

## Planting Mode Workflow

### Activation

User clicks "Add This Plant to My Farm" or "Add Planting" button on map.

### States

1. **Enter Planting Mode**
   - Map cursor changes to crosshair
   - Selected species info in sticky header/toast
   - Map controls show "Exit Planting Mode" button

2. **Click to Place**
   - User clicks map location
   - Mini-form appears with:
     - Species (pre-selected or searchable dropdown)
     - Custom name (optional, e.g., "Oak by shed")
     - Planted year (defaults to current year)
     - Zone association (dropdown, optional)
     - Notes field
   - Plant marker appears immediately

3. **Batch Mode**
   - "Place multiple [Species]" option
   - Stays in planting mode after each placement
   - Good for planting rows/guilds

4. **Exit**
   - ESC key, "Done Planting" button, or click other map tools

### Visual Display

- Plantings render as circular markers sized by mature width
- Color-coded by layer:
  - Canopy: Dark green
  - Understory: Medium green
  - Shrub: Light green
  - Herbaceous: Yellow-green
  - Groundcover: Pale green
  - Vine: Purple
  - Root: Brown
  - Aquatic: Blue
- Click existing planting: Detail popup with edit/delete

## AI Integration

### Enhanced Context

Add to existing AI context (alongside legend/zones):

```
Native Species Available for This Farm (Perfect Matches):
- White Oak (Quercus alba): Canopy, 80ft, Zones 3-9, functions: wildlife_habitat, acorn production
- Serviceberry (Amelanchier canadensis): Understory, 20ft, Zones 4-8, functions: edible_fruit, pollinator_support
- American Hazelnut (Corylus americana): Shrub, 10ft, Zones 4-9, functions: edible_nuts, wildlife_food
[...10-15 top matches]

When suggesting plants, prioritize these natives and explain their permaculture functions.
```

### AI-Generated Content

For species lacking detailed descriptions:
- Trigger AI to generate permaculture function explanations
- Generate companion planting suggestions
- Create zone placement recommendations
- Store in database with `ai_generated = 1` flag
- Community can edit/improve over time

## Database Growth Strategy

### 1. AI-Generated Baseline
- Auto-generate content for incomplete species
- Mark as `ai_generated: true`
- Replace with human-verified content over time

### 2. Usage Analytics
- Track most-planted species per region
- Surface "Popular in [Region]" badges
- Identify gaps to prioritize additions

### 3. Community Contributions
- Users suggest edits (Wikipedia-style)
- "Add to Species Database" for missing plants
- Contributor reputation tracking

### 4. Real-World Performance Data
- Track planting success rates by zone/region
- "37 users successfully grew this in Zone 6"
- Failed plantings inform warnings

### 5. Future Nursery Integration
- Nurseries update availability/pricing
- User reviews and ratings
- Stock reliability tracking

**Growth Target**: 50-100 natives per region → 500+ in year 1 → 1000s with deep data

## Technical Implementation

### New API Endpoints

```typescript
// Global species catalog
GET /api/species
  ?filter=native|naturalized|all
  &layer=canopy|understory|shrub|herbaceous|groundcover|vine|root|aquatic
  &hardiness_zone=6
  &function=nitrogen_fixer|edible|wildlife_habitat|erosion_control
  &search=oak
  &region=Northeast|Southeast|Midwest|West|Southwest|Pacific_Northwest

// Farm-specific native recommendations
GET /api/farms/[farmId]/native-species
  Returns: {
    perfect_match: Species[],
    good_match: Species[],
    possible: Species[]
  }

// Species detail
GET /api/species/[speciesId]
  Returns: Full species data + usage stats

// Add/edit species (community)
POST /api/species
PUT /api/species/[speciesId]
  Body: Species data + contribution notes

// Planting CRUD
POST /api/farms/[farmId]/plantings
  Body: {
    species_id: string,
    lat: number,
    lng: number,
    planted_year: number,
    zone_id?: string,
    notes?: string,
    custom_name?: string
  }

GET /api/farms/[farmId]/plantings
  Returns: Planting[] with species data joined

PUT /api/farms/[farmId]/plantings/[plantingId]
DELETE /api/farms/[farmId]/plantings/[plantingId]
```

### Native Matching Function

`lib/species/native-matcher.ts`:

```typescript
export function matchNativeSpecies(farm: Farm, allSpecies: Species[]) {
  const farmZone = parseInt(farm.climate_zone || "0");
  const farmRegion = getFarmRegion(farm.center_lat, farm.center_lng);

  return {
    perfect_match: allSpecies.filter(s =>
      s.is_native === 1 &&
      isInHardinessRange(s, farmZone) &&
      includesRegion(s.broad_regions, farmRegion)
    ),
    good_match: allSpecies.filter(s =>
      s.is_native === 1 &&
      (isInHardinessRange(s, farmZone) || includesRegion(s.broad_regions, farmRegion))
    ),
    possible: allSpecies.filter(s =>
      s.is_native === 0 && isInHardinessRange(s, farmZone)
    )
  };
}

function isInHardinessRange(species: Species, farmZone: number): boolean {
  const min = parseInt(species.min_hardiness_zone || "0");
  const max = parseInt(species.max_hardiness_zone || "13");
  return farmZone >= min && farmZone <= max;
}

function includesRegion(speciesRegions: string | null, farmRegion: string): boolean {
  if (!speciesRegions) return false;
  const regions = JSON.parse(speciesRegions);
  return regions.includes(farmRegion);
}

function getFarmRegion(lat: number, lng: number): string {
  // Simple lat/lng to region mapping
  if (lng < -100) {
    if (lat > 42) return "Pacific_Northwest";
    if (lat > 35) return "West";
    return "Southwest";
  }
  if (lng < -95) {
    if (lat > 40) return "Midwest";
    return "South";
  }
  if (lat > 40) return "Northeast";
  if (lat > 36) return "Mid_Atlantic";
  return "Southeast";
}
```

### Component Structure

```
app/(app)/plants/
  page.tsx                               # Global catalog page
  [speciesId]/page.tsx                   # Species detail page

components/species/
  species-browser.tsx                    # Filterable grid of species cards
  species-card.tsx                       # Individual species card
  species-detail-modal.tsx               # Full detail view (modal)
  species-filter-sidebar.tsx             # Filter controls
  species-search.tsx                     # Search input with autocomplete
  species-picker.tsx                     # Searchable dropdown for planting form

components/map/
  planting-mode.tsx                      # Planting mode state management
  planting-marker.tsx                    # Individual planting on map
  planting-detail-popup.tsx              # Edit/delete popup
  planting-form.tsx                      # Mini-form for new plantings

lib/species/
  native-matcher.ts                      # Matching logic
  species-queries.ts                     # Database queries
  region-mapper.ts                       # Lat/lng to region
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Database schema updates (migration script)
- Seed expanded species data (50-100 species, 2-3 regions)
- Native matching function (`lib/species/native-matcher.ts`)
- Basic species API endpoints (`/api/species/*`)

### Phase 2: Global Catalog (Week 2-3)
- `/plants` page with grid view
- Filter sidebar (native status, layer, zones, functions)
- Species detail modal with permaculture info
- Search functionality with autocomplete

### Phase 3: Farm Integration (Week 3-4)
- "Native Plants for This Farm" panel in farm editor
- Perfect Match / Good Match / Possible tabs
- Species browser integration with map context
- API endpoint for farm-specific recommendations

### Phase 4: Planting Mode (Week 4-5)
- Map planting workflow (crosshair cursor, click to place)
- Planting detail form (species, name, year, zone, notes)
- Visual markers on map (color-coded by layer)
- CRUD operations for plantings (API + UI)
- Growth timeline slider integration (show size at different years)

### Phase 5: AI Enhancement (Week 5-6)
- Include native species in AI context
- AI-generated species descriptions for incomplete entries
- Enhanced recommendations with native-first priority
- AI explains WHY each plant works for the site

### Phase 6: Community Features (Future)
- User contributions to species database
- Edit/approval workflow
- Planting success tracking and reviews
- Nursery directory and marketplace prep
- Performance analytics by region

## Success Metrics

- **Engagement**: Users browse species catalog before asking AI questions
- **Native Priority**: 70%+ of AI-recommended plants are natives
- **Planting Activity**: Users successfully place plantings on map
- **Database Growth**: Species database grows 20+ entries/month through community
- **Education**: Users view species detail pages before planting
- **Retention**: Users return to track plantings over multiple seasons

## Future Enhancements

- Photo galleries (seasonal progression, mature specimens)
- Propagation guides (seed starting, cuttings, division)
- Pest/disease reference
- Guild templates (pre-designed plant groupings)
- Nursery marketplace integration
- Community planting journals
- Regional expert verification badges
- Mobile app for field identification

---

*This design document was created through collaborative brainstorming and represents the approved vision for the native species index feature.*
