# Native Species Index & Planting System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build comprehensive native plant catalog with educational permaculture content, farm-contextual recommendations, and map-based planting workflow.

**Architecture:** Database-first approach with species table enhancements, API endpoints for filtering/matching, React components for global catalog and farm browser, MapLibre integration for planting mode with GeoJSON markers.

**Tech Stack:** Next.js 14 App Router, Turso (libSQL), MapLibre GL JS, shadcn/ui, Tailwind CSS, OpenRouter AI

---

## PHASE 1: Database Foundation & Matching Logic

### Task 1: Database Schema Migration

**Files:**
- Create: `lib/db/migrations/002_species_enhancements.sql`
- Modify: `lib/db/schema.ts:44-60`

**Step 1: Write migration SQL**

Create `lib/db/migrations/002_species_enhancements.sql`:

```sql
-- Add permaculture and geographic fields to species table
ALTER TABLE species ADD COLUMN permaculture_functions TEXT;
ALTER TABLE species ADD COLUMN companion_plants TEXT;
ALTER TABLE species ADD COLUMN zone_placement_notes TEXT;
ALTER TABLE species ADD COLUMN edible_parts TEXT;
ALTER TABLE species ADD COLUMN sourcing_notes TEXT;
ALTER TABLE species ADD COLUMN broad_regions TEXT;
ALTER TABLE species ADD COLUMN min_hardiness_zone TEXT;
ALTER TABLE species ADD COLUMN max_hardiness_zone TEXT;
ALTER TABLE species ADD COLUMN min_rainfall_inches REAL;
ALTER TABLE species ADD COLUMN max_rainfall_inches REAL;
ALTER TABLE species ADD COLUMN ai_generated INTEGER DEFAULT 0;
```

**Step 2: Update TypeScript schema**

Modify `lib/db/schema.ts:44-60`:

```typescript
export interface Species {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  native_regions: string | null; // JSON (deprecated, use broad_regions)
  is_native: number;
  years_to_maturity: number | null;
  mature_height_ft: number | null;
  mature_width_ft: number | null;
  sun_requirements: string | null;
  water_requirements: string | null;
  hardiness_zones: string | null; // Deprecated, use min/max
  description: string | null;
  contributed_by: string | null;
  created_at: number;

  // New permaculture fields
  permaculture_functions: string | null; // JSON array
  companion_plants: string | null; // JSON array
  zone_placement_notes: string | null;
  edible_parts: string | null; // JSON object
  sourcing_notes: string | null;

  // New geographic fields
  broad_regions: string | null; // JSON array
  min_hardiness_zone: string | null;
  max_hardiness_zone: string | null;
  min_rainfall_inches: number | null;
  max_rainfall_inches: number | null;
  ai_generated: number;
}
```

**Step 3: Run migration**

Run: `turso db shell permacraft < lib/db/migrations/002_species_enhancements.sql`
Expected: Success message, no errors

**Step 4: Verify schema change**

Run: `turso db shell permacraft "PRAGMA table_info(species);"`
Expected: New columns appear in output

**Step 5: Commit**

```bash
git add lib/db/migrations/002_species_enhancements.sql lib/db/schema.ts
git commit -m "feat(db): add permaculture and geographic fields to species table"
```

---

### Task 2: Seed Enhanced Species Data

**Files:**
- Create: `data/seed-species-enhanced.sql`

**Step 1: Write enhanced seed data**

Create `data/seed-species-enhanced.sql`:

```sql
-- Update existing species with enhanced data
UPDATE species SET
  permaculture_functions = '["wildlife_habitat","acorn_production","shade_provider"]',
  companion_plants = '["Serviceberry","American Hazelnut"]',
  zone_placement_notes = 'Excellent for Zone 2-3 as canopy anchor. Too large for Zone 1.',
  edible_parts = '{"acorns":"fall (after leaching)"}',
  sourcing_notes = 'Available at most native plant nurseries in the Eastern US.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 60
WHERE id = 'sp-oak';

UPDATE species SET
  permaculture_functions = '["edible_fruit","pollinator_support","wildlife_habitat","spring_flowers"]',
  companion_plants = '["White Oak","Eastern Redbud"]',
  zone_placement_notes = 'Perfect for Zone 1-2 understory. Plant under larger canopy trees.',
  edible_parts = '{"berries":"early summer"}',
  sourcing_notes = 'Widely available at native nurseries. Easy to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '8',
  min_rainfall_inches = 30,
  max_rainfall_inches = 50
WHERE id = 'sp-serviceberry';

UPDATE species SET
  permaculture_functions = '["nitrogen_fixer","spring_flowers","pollinator_support"]',
  companion_plants = '["Serviceberry","Elderberry"]',
  zone_placement_notes = 'Great for Zone 1-2 as ornamental and nitrogen source.',
  edible_parts = '{}',
  sourcing_notes = 'Common at nurseries. Grows quickly.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 55
WHERE id = 'sp-redbud';

UPDATE species SET
  permaculture_functions = '["edible_nuts","wildlife_food","thicket_former"]',
  companion_plants = '["Elderberry","Eastern Redbud"]',
  zone_placement_notes = 'Excellent for Zone 1-2. Forms thickets for wildlife.',
  edible_parts = '{"nuts":"fall"}',
  sourcing_notes = 'Available at specialty native nurseries. Can be slow to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 50
WHERE id = 'sp-hazelnut';

UPDATE species SET
  permaculture_functions = '["edible_fruit","medicinal","pollinator_support","wildlife_habitat"]',
  companion_plants = '["American Hazelnut","Goldenrod"]',
  zone_placement_notes = 'Zone 1-2 for easy harvest. Tolerates wet areas.',
  edible_parts = '{"flowers":"spring","berries":"late summer"}',
  sourcing_notes = 'Common at native nurseries. Very adaptable.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 30,
  max_rainfall_inches = 60
WHERE id = 'sp-elderberry';

UPDATE species SET
  permaculture_functions = '["pollinator_support","late_season_nectar","dynamic_accumulator"]',
  companion_plants = '["Common Milkweed","White Clover"]',
  zone_placement_notes = 'Zone 2-4. Important for pollinators. Spreads readily.',
  edible_parts = '{}',
  sourcing_notes = 'Easy to grow from seed. Often free from conservation districts.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest","West"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 15,
  max_rainfall_inches = 45
WHERE id = 'sp-goldenrod';

UPDATE species SET
  permaculture_functions = '["pollinator_support","monarch_host","wildlife_habitat"]',
  companion_plants = '["Goldenrod","native grasses"]',
  zone_placement_notes = 'Zone 2-4. Essential for monarchs. Spreads by rhizomes.',
  edible_parts = '{}',
  sourcing_notes = 'Free seeds from conservation groups. Easy to establish.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '9',
  min_rainfall_inches = 20,
  max_rainfall_inches = 50
WHERE id = 'sp-milkweed';

UPDATE species SET
  permaculture_functions = '["nitrogen_fixer","groundcover","pollinator_support"]',
  companion_plants = '["fruit trees","pasture grasses"]',
  zone_placement_notes = 'Zone 0-3. Excellent living mulch under trees.',
  edible_parts = '{}',
  sourcing_notes = 'Widely available. Naturalized in North America.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest","West","Pacific_Northwest"]',
  min_hardiness_zone = '3',
  max_hardiness_zone = '10',
  min_rainfall_inches = 20,
  max_rainfall_inches = 50,
  ai_generated = 0
WHERE id = 'sp-clover';

UPDATE species SET
  permaculture_functions = '["edible_fruit","wildlife_food","vertical_layer","erosion_control"]',
  companion_plants = '["tree supports","forest edge plants"]',
  zone_placement_notes = 'Zone 2-4. Needs strong support structure.',
  edible_parts = '{"fruit":"fall"}',
  sourcing_notes = 'Cuttings often available from other growers. Easy to propagate.',
  broad_regions = '["Northeast","Mid_Atlantic","Southeast","Midwest"]',
  min_hardiness_zone = '4',
  max_hardiness_zone = '9',
  min_rainfall_inches = 25,
  max_rainfall_inches = 55
WHERE id = 'sp-grape';
```

**Step 2: Run seed script**

Run: `turso db shell permacraft < data/seed-species-enhanced.sql`
Expected: 9 rows updated

**Step 3: Verify data**

Run: `turso db shell permacraft "SELECT common_name, broad_regions, permaculture_functions FROM species LIMIT 3;"`
Expected: See enhanced JSON data

**Step 4: Commit**

```bash
git add data/seed-species-enhanced.sql
git commit -m "feat(data): add enhanced permaculture data for existing species"
```

---

### Task 3: Region Mapper Utility

**Files:**
- Create: `lib/species/region-mapper.ts`
- Create: `lib/species/region-mapper.test.ts`

**Step 1: Write the failing test**

Create `lib/species/region-mapper.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getFarmRegion, Region } from './region-mapper';

describe('getFarmRegion', () => {
  it('should map Pacific Northwest coordinates', () => {
    const region = getFarmRegion(47.6062, -122.3321); // Seattle
    expect(region).toBe('Pacific_Northwest');
  });

  it('should map Northeast coordinates', () => {
    const region = getFarmRegion(42.3601, -71.0589); // Boston
    expect(region).toBe('Northeast');
  });

  it('should map Southeast coordinates', () => {
    const region = getFarmRegion(33.7490, -84.3880); // Atlanta
    expect(region).toBe('Southeast');
  });

  it('should map Midwest coordinates', () => {
    const region = getFarmRegion(41.8781, -87.6298); // Chicago
    expect(region).toBe('Midwest');
  });

  it('should map Southwest coordinates', () => {
    const region = getFarmRegion(33.4484, -112.0740); // Phoenix
    expect(region).toBe('Southwest');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- region-mapper.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `lib/species/region-mapper.ts`:

```typescript
export type Region =
  | 'Northeast'
  | 'Mid_Atlantic'
  | 'Southeast'
  | 'Midwest'
  | 'South'
  | 'West'
  | 'Southwest'
  | 'Pacific_Northwest';

/**
 * Map farm coordinates to broad US region
 * Simple lat/lng-based approximation
 */
export function getFarmRegion(lat: number, lng: number): Region {
  // West of -100° longitude = Western regions
  if (lng < -100) {
    if (lat > 42) return 'Pacific_Northwest';
    if (lat > 35) return 'West';
    return 'Southwest';
  }

  // Between -100° and -95° = Central regions
  if (lng < -95) {
    if (lat > 40) return 'Midwest';
    return 'South';
  }

  // East of -95° = Eastern regions
  if (lat > 40) return 'Northeast';
  if (lat > 36) return 'Mid_Atlantic';
  return 'Southeast';
}

/**
 * Get human-readable region name
 */
export function getRegionName(region: Region): string {
  const names: Record<Region, string> = {
    'Northeast': 'Northeast',
    'Mid_Atlantic': 'Mid-Atlantic',
    'Southeast': 'Southeast',
    'Midwest': 'Midwest',
    'South': 'South',
    'West': 'West',
    'Southwest': 'Southwest',
    'Pacific_Northwest': 'Pacific Northwest'
  };
  return names[region];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- region-mapper.test.ts`
Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add lib/species/region-mapper.ts lib/species/region-mapper.test.ts
git commit -m "feat(species): add region mapper utility with tests"
```

---

### Task 4: Native Matcher Core Logic

**Files:**
- Create: `lib/species/native-matcher.ts`
- Create: `lib/species/native-matcher.test.ts`

**Step 1: Write the failing test**

Create `lib/species/native-matcher.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { matchNativeSpecies, isInHardinessRange, includesRegion } from './native-matcher';
import type { Farm } from '@/lib/db/schema';
import type { Species } from '@/lib/db/schema';

describe('isInHardinessRange', () => {
  it('should return true when farm zone is in species range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 6)).toBe(true);
  });

  it('should return false when farm zone is below range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 3)).toBe(false);
  });

  it('should return false when farm zone is above range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 9)).toBe(false);
  });
});

describe('includesRegion', () => {
  it('should return true when region is in species broad_regions', () => {
    expect(includesRegion('["Northeast","Midwest"]', 'Northeast')).toBe(true);
  });

  it('should return false when region is not in species broad_regions', () => {
    expect(includesRegion('["Northeast","Midwest"]', 'Southwest')).toBe(false);
  });

  it('should return false when broad_regions is null', () => {
    expect(includesRegion(null, 'Northeast')).toBe(false);
  });
});

describe('matchNativeSpecies', () => {
  const mockFarm: Farm = {
    id: 'farm-1',
    user_id: 'user-1',
    name: 'Test Farm',
    description: null,
    acres: 5,
    climate_zone: '6',
    rainfall_inches: 40,
    soil_type: null,
    center_lat: 42.3601,
    center_lng: -71.0589,
    zoom_level: 15,
    is_public: 0,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  const mockSpecies: Species[] = [
    {
      id: 'sp-1',
      common_name: 'Perfect Match Plant',
      scientific_name: 'Perfectus matchicus',
      layer: 'canopy',
      is_native: 1,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Northeast"]',
      native_regions: null,
      years_to_maturity: 10,
      mature_height_ft: 50,
      mature_width_ft: 40,
      sun_requirements: 'Full sun',
      water_requirements: 'Medium',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    },
    {
      id: 'sp-2',
      common_name: 'Good Match Plant',
      scientific_name: 'Goodus matchicus',
      layer: 'shrub',
      is_native: 1,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Midwest"]',
      native_regions: null,
      years_to_maturity: 5,
      mature_height_ft: 10,
      mature_width_ft: 8,
      sun_requirements: 'Part shade',
      water_requirements: 'Medium',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    },
    {
      id: 'sp-3',
      common_name: 'Non-Native Possible',
      scientific_name: 'Nonnativus possibilis',
      layer: 'herbaceous',
      is_native: 0,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Northeast"]',
      native_regions: null,
      years_to_maturity: 1,
      mature_height_ft: 3,
      mature_width_ft: 2,
      sun_requirements: 'Full sun',
      water_requirements: 'Low',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    }
  ];

  it('should categorize species correctly', () => {
    const result = matchNativeSpecies(mockFarm, mockSpecies);

    expect(result.perfect_match).toHaveLength(1);
    expect(result.perfect_match[0].id).toBe('sp-1');

    expect(result.good_match).toHaveLength(1);
    expect(result.good_match[0].id).toBe('sp-2');

    expect(result.possible).toHaveLength(1);
    expect(result.possible[0].id).toBe('sp-3');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- native-matcher.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `lib/species/native-matcher.ts`:

```typescript
import type { Farm, Species } from '@/lib/db/schema';
import { getFarmRegion } from './region-mapper';

export interface MatchedSpecies {
  perfect_match: Species[];
  good_match: Species[];
  possible: Species[];
}

/**
 * Check if farm's hardiness zone falls within species' range
 */
export function isInHardinessRange(species: Species, farmZone: number): boolean {
  const min = parseInt(species.min_hardiness_zone || '0');
  const max = parseInt(species.max_hardiness_zone || '13');
  return farmZone >= min && farmZone <= max;
}

/**
 * Check if farm's region is in species' broad_regions array
 */
export function includesRegion(speciesRegions: string | null, farmRegion: string): boolean {
  if (!speciesRegions) return false;
  try {
    const regions = JSON.parse(speciesRegions);
    return Array.isArray(regions) && regions.includes(farmRegion);
  } catch {
    return false;
  }
}

/**
 * Match species to farm based on native status, hardiness, and region
 * Returns categorized lists: perfect_match, good_match, possible
 */
export function matchNativeSpecies(farm: Farm, allSpecies: Species[]): MatchedSpecies {
  const farmZone = parseInt(farm.climate_zone || '0');
  const farmRegion = getFarmRegion(farm.center_lat, farm.center_lng);

  const perfect_match: Species[] = [];
  const good_match: Species[] = [];
  const possible: Species[] = [];

  for (const species of allSpecies) {
    const inZone = isInHardinessRange(species, farmZone);
    const inRegion = includesRegion(species.broad_regions, farmRegion);

    if (species.is_native === 1) {
      if (inZone && inRegion) {
        perfect_match.push(species);
      } else if (inZone || inRegion) {
        good_match.push(species);
      }
    } else if (inZone) {
      possible.push(species);
    }
  }

  return { perfect_match, good_match, possible };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- native-matcher.test.ts`
Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add lib/species/native-matcher.ts lib/species/native-matcher.test.ts
git commit -m "feat(species): add native species matcher with comprehensive tests"
```

---

### Task 5: Species Query Helper

**Files:**
- Create: `lib/species/species-queries.ts`

**Step 1: Write species query functions**

Create `lib/species/species-queries.ts`:

```typescript
import { db } from '@/lib/db';
import type { Species } from '@/lib/db/schema';

/**
 * Get all species with optional filters
 */
export async function getAllSpecies(filters?: {
  native?: boolean;
  layer?: string;
  search?: string;
}): Promise<Species[]> {
  let sql = 'SELECT * FROM species WHERE 1=1';
  const args: any[] = [];

  if (filters?.native !== undefined) {
    sql += ' AND is_native = ?';
    args.push(filters.native ? 1 : 0);
  }

  if (filters?.layer) {
    sql += ' AND layer = ?';
    args.push(filters.layer);
  }

  if (filters?.search) {
    sql += ' AND (common_name LIKE ? OR scientific_name LIKE ?)';
    const searchParam = `%${filters.search}%`;
    args.push(searchParam, searchParam);
  }

  sql += ' ORDER BY common_name ASC';

  const result = await db.execute({ sql, args });
  return result.rows as Species[];
}

/**
 * Get species by ID
 */
export async function getSpeciesById(id: string): Promise<Species | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM species WHERE id = ?',
    args: [id]
  });

  return result.rows[0] as Species || null;
}

/**
 * Get species by IDs (for companion plants lookup)
 */
export async function getSpeciesByIds(ids: string[]): Promise<Species[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT * FROM species WHERE id IN (${placeholders})`,
    args: ids
  });

  return result.rows as Species[];
}

/**
 * Search species by common or scientific name
 */
export async function searchSpecies(query: string, limit: number = 10): Promise<Species[]> {
  const searchParam = `%${query}%`;

  const result = await db.execute({
    sql: `SELECT * FROM species
          WHERE common_name LIKE ? OR scientific_name LIKE ?
          ORDER BY common_name ASC
          LIMIT ?`,
    args: [searchParam, searchParam, limit]
  });

  return result.rows as Species[];
}
```

**Step 2: Commit**

```bash
git add lib/species/species-queries.ts
git commit -m "feat(species): add database query helper functions"
```

---

## PHASE 2: API Endpoints

### Task 6: Species List API

**Files:**
- Create: `app/api/species/route.ts`

**Step 1: Write API route**

Create `app/api/species/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAllSpecies } from '@/lib/species/species-queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const nativeParam = searchParams.get('filter');
    const layer = searchParams.get('layer');
    const search = searchParams.get('search');

    const filters: any = {};

    if (nativeParam === 'native') {
      filters.native = true;
    } else if (nativeParam === 'naturalized') {
      filters.native = false;
    }

    if (layer) {
      filters.layer = layer;
    }

    if (search) {
      filters.search = search;
    }

    const species = await getAllSpecies(filters);

    return Response.json({ species });
  } catch (error) {
    console.error('Species API error:', error);
    return Response.json(
      { error: 'Failed to fetch species' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test API endpoint**

Run: `npm run dev` (in background)
Run: `curl http://localhost:3000/api/species?filter=native | jq`
Expected: JSON response with native species array

**Step 3: Commit**

```bash
git add app/api/species/route.ts
git commit -m "feat(api): add species list endpoint with filters"
```

---

### Task 7: Species Detail API

**Files:**
- Create: `app/api/species/[speciesId]/route.ts`

**Step 1: Write species detail API**

Create `app/api/species/[speciesId]/route.ts`:

```typescript
import { getSpeciesById, getSpeciesByIds } from '@/lib/species/species-queries';
import type { Species } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { speciesId: string } }
) {
  try {
    const species = await getSpeciesById(params.speciesId);

    if (!species) {
      return Response.json(
        { error: 'Species not found' },
        { status: 404 }
      );
    }

    // Parse companion plants and fetch their details
    let companions: Species[] = [];
    if (species.companion_plants) {
      try {
        const companionIds = JSON.parse(species.companion_plants);
        if (Array.isArray(companionIds) && companionIds.length > 0) {
          companions = await getSpeciesByIds(companionIds);
        }
      } catch (e) {
        console.error('Failed to parse companion plants:', e);
      }
    }

    return Response.json({
      species,
      companions
    });
  } catch (error) {
    console.error('Species detail API error:', error);
    return Response.json(
      { error: 'Failed to fetch species details' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test API endpoint**

Run: `curl http://localhost:3000/api/species/sp-oak | jq`
Expected: JSON with species details and companions array

**Step 3: Commit**

```bash
git add app/api/species/[speciesId]/route.ts
git commit -m "feat(api): add species detail endpoint with companion lookup"
```

---

### Task 8: Farm Native Species API

**Files:**
- Create: `app/api/farms/[farmId]/native-species/route.ts`

**Step 1: Write farm-specific native species API**

Create `app/api/farms/[farmId]/native-species/route.ts`:

```typescript
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getAllSpecies } from '@/lib/species/species-queries';
import { matchNativeSpecies } from '@/lib/species/native-matcher';
import type { Farm } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { farmId: string } }
) {
  try {
    const session = await requireAuth();

    // Get farm and verify ownership or public
    const farmResult = await db.execute({
      sql: 'SELECT * FROM farms WHERE id = ? AND (user_id = ? OR is_public = 1)',
      args: [params.farmId, session.user.id]
    });

    const farm = farmResult.rows[0] as Farm;

    if (!farm) {
      return Response.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }

    // Get all species
    const allSpecies = await getAllSpecies();

    // Match species to farm
    const matched = matchNativeSpecies(farm, allSpecies);

    return Response.json(matched);
  } catch (error) {
    console.error('Farm native species API error:', error);
    return Response.json(
      { error: 'Failed to fetch native species recommendations' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test API endpoint**

Run: `curl -H "Cookie: ..." http://localhost:3000/api/farms/FARM_ID/native-species | jq`
Expected: JSON with perfect_match, good_match, possible arrays

**Step 3: Commit**

```bash
git add app/api/farms/[farmId]/native-species/route.ts
git commit -m "feat(api): add farm-specific native species recommendations"
```

---

## PHASE 3: Global Plants Catalog UI

### Task 9: Species Card Component

**Files:**
- Create: `components/species/species-card.tsx`

**Step 1: Write species card component**

Create `components/species/species-card.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Species } from '@/lib/db/schema';

interface SpeciesCardProps {
  species: Species;
  onClick?: () => void;
}

export function SpeciesCard({ species, onClick }: SpeciesCardProps) {
  const regions = species.broad_regions
    ? JSON.parse(species.broad_regions).join(', ')
    : 'Various';

  const functions = species.permaculture_functions
    ? JSON.parse(species.permaculture_functions)
    : [];

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight">
              {species.common_name}
            </h3>
            <p className="text-sm text-muted-foreground italic">
              {species.scientific_name}
            </p>
          </div>
          {species.is_native === 1 && (
            <Badge variant="default" className="bg-green-600 shrink-0">
              Native
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Layer:</span>{' '}
            <span className="capitalize">{species.layer}</span>
          </div>
          <div>
            <span className="font-medium">Zones:</span>{' '}
            {species.min_hardiness_zone && species.max_hardiness_zone
              ? `${species.min_hardiness_zone}-${species.max_hardiness_zone}`
              : 'Not specified'}
          </div>
          <div>
            <span className="font-medium">Regions:</span>{' '}
            {regions}
          </div>
          {functions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {functions.slice(0, 3).map((fn: string) => (
                <Badge key={fn} variant="outline" className="text-xs">
                  {fn.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/species/species-card.tsx
git commit -m "feat(ui): add species card component"
```

---

### Task 10: Species Filter Sidebar

**Files:**
- Create: `components/species/species-filter-sidebar.tsx`

**Step 1: Write filter sidebar component**

Create `components/species/species-filter-sidebar.tsx`:

```typescript
'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const LAYERS = [
  'canopy',
  'understory',
  'shrub',
  'herbaceous',
  'groundcover',
  'vine',
  'root',
  'aquatic'
];

const FUNCTIONS = [
  'nitrogen_fixer',
  'wildlife_habitat',
  'edible_fruit',
  'edible_nuts',
  'pollinator_support',
  'erosion_control',
  'medicinal'
];

interface SpeciesFilterSidebarProps {
  nativeFilter: 'all' | 'native' | 'naturalized';
  onNativeFilterChange: (value: 'all' | 'native' | 'naturalized') => void;
  layerFilter: string[];
  onLayerFilterChange: (layers: string[]) => void;
  functionFilter: string[];
  onFunctionFilterChange: (functions: string[]) => void;
}

export function SpeciesFilterSidebar({
  nativeFilter,
  onNativeFilterChange,
  layerFilter,
  onLayerFilterChange,
  functionFilter,
  onFunctionFilterChange
}: SpeciesFilterSidebarProps) {
  const handleLayerToggle = (layer: string) => {
    if (layerFilter.includes(layer)) {
      onLayerFilterChange(layerFilter.filter(l => l !== layer));
    } else {
      onLayerFilterChange([...layerFilter, layer]);
    }
  };

  const handleFunctionToggle = (fn: string) => {
    if (functionFilter.includes(fn)) {
      onFunctionFilterChange(functionFilter.filter(f => f !== fn));
    } else {
      onFunctionFilterChange([...functionFilter, fn]);
    }
  };

  return (
    <div className="space-y-6 p-4 border-r bg-card">
      <div>
        <h3 className="font-semibold mb-3">Native Status</h3>
        <RadioGroup value={nativeFilter} onValueChange={onNativeFilterChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">All Plants</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="native" id="native" />
            <Label htmlFor="native">Native Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="naturalized" id="naturalized" />
            <Label htmlFor="naturalized">Naturalized/Non-Native</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Layer</h3>
        <div className="space-y-2">
          {LAYERS.map(layer => (
            <div key={layer} className="flex items-center space-x-2">
              <Checkbox
                id={`layer-${layer}`}
                checked={layerFilter.includes(layer)}
                onCheckedChange={() => handleLayerToggle(layer)}
              />
              <Label
                htmlFor={`layer-${layer}`}
                className="capitalize cursor-pointer"
              >
                {layer}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Functions</h3>
        <div className="space-y-2">
          {FUNCTIONS.map(fn => (
            <div key={fn} className="flex items-center space-x-2">
              <Checkbox
                id={`fn-${fn}`}
                checked={functionFilter.includes(fn)}
                onCheckedChange={() => handleFunctionToggle(fn)}
              />
              <Label
                htmlFor={`fn-${fn}`}
                className="capitalize cursor-pointer text-sm"
              >
                {fn.replace(/_/g, ' ')}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/species/species-filter-sidebar.tsx
git commit -m "feat(ui): add species filter sidebar with layers and functions"
```

---

### Task 11: Global Plants Catalog Page

**Files:**
- Create: `app/(app)/plants/page.tsx`

**Step 1: Write plants catalog page**

Create `app/(app)/plants/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SpeciesCard } from '@/components/species/species-card';
import { SpeciesFilterSidebar } from '@/components/species/species-filter-sidebar';
import type { Species } from '@/lib/db/schema';
import { Search } from 'lucide-react';

export default function PlantsPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [nativeFilter, setNativeFilter] = useState<'all' | 'native' | 'naturalized'>('all');
  const [layerFilter, setLayerFilter] = useState<string[]>([]);
  const [functionFilter, setFunctionFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchSpecies();
  }, [nativeFilter]);

  const fetchSpecies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nativeFilter !== 'all') {
        params.set('filter', nativeFilter);
      }

      const response = await fetch(`/api/species?${params}`);
      const data = await response.json();
      setSpecies(data.species || []);
    } catch (error) {
      console.error('Failed to fetch species:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecies = species.filter(s => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        s.common_name.toLowerCase().includes(query) ||
        s.scientific_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Layer filter
    if (layerFilter.length > 0 && !layerFilter.includes(s.layer)) {
      return false;
    }

    // Function filter
    if (functionFilter.length > 0) {
      const speciesFunctions = s.permaculture_functions
        ? JSON.parse(s.permaculture_functions)
        : [];
      const hasFunction = functionFilter.some(fn => speciesFunctions.includes(fn));
      if (!hasFunction) return false;
    }

    return true;
  });

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 overflow-y-auto">
        <SpeciesFilterSidebar
          nativeFilter={nativeFilter}
          onNativeFilterChange={setNativeFilter}
          layerFilter={layerFilter}
          onLayerFilterChange={setLayerFilter}
          functionFilter={functionFilter}
          onFunctionFilterChange={setFunctionFilter}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Plant Catalog</h1>
            <p className="text-muted-foreground">
              Browse native and naturalized species for your permaculture design
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by common or scientific name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading species...
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {filteredSpecies.length} species found
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpecies.map(s => (
                  <SpeciesCard
                    key={s.id}
                    species={s}
                    onClick={() => {
                      // TODO: Open detail modal
                      console.log('View species:', s.id);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Test page**

Run: Visit `http://localhost:3000/plants` in browser
Expected: See species catalog with filters and search

**Step 3: Commit**

```bash
git add app/(app)/plants/page.tsx
git commit -m "feat(ui): add global plants catalog page with filtering"
```

---

## PHASE 4: Planting Mode & Map Integration

### Task 12: Planting API Endpoints

**Files:**
- Create: `app/api/farms/[farmId]/plantings/route.ts`

**Step 1: Write plantings CRUD API**

Create `app/api/farms/[farmId]/plantings/route.ts`:

```typescript
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Planting } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { farmId: string } }
) {
  try {
    const session = await requireAuth();

    // Verify farm ownership
    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [params.farmId, session.user.id]
    });

    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Get all plantings with species data
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            WHERE p.farm_id = ?
            ORDER BY p.created_at DESC`,
      args: [params.farmId]
    });

    return Response.json({ plantings: result.rows });
  } catch (error) {
    console.error('Get plantings error:', error);
    return Response.json(
      { error: 'Failed to fetch plantings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { farmId: string } }
) {
  try {
    const session = await requireAuth();

    // Verify farm ownership
    const farmCheck = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [params.farmId, session.user.id]
    });

    if (farmCheck.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const body = await request.json();
    const { species_id, lat, lng, planted_year, zone_id, notes, custom_name } = body;

    // Validate required fields
    if (!species_id || !lat || !lng) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const plantingId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();

    await db.execute({
      sql: `INSERT INTO plantings
            (id, farm_id, species_id, lat, lng, planted_year, current_year, zone_id, notes, name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        plantingId,
        params.farmId,
        species_id,
        lat,
        lng,
        planted_year || currentYear,
        currentYear,
        zone_id || null,
        notes || null,
        custom_name || null
      ]
    });

    // Fetch created planting with species data
    const result = await db.execute({
      sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer,
                   s.mature_width_ft, s.mature_height_ft, s.years_to_maturity
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            WHERE p.id = ?`,
      args: [plantingId]
    });

    return Response.json({ planting: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create planting error:', error);
    return Response.json(
      { error: 'Failed to create planting' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test API**

Run: `curl -X POST -H "Content-Type: application/json" -d '{"species_id":"sp-oak","lat":42.5,"lng":-71.5}' http://localhost:3000/api/farms/FARM_ID/plantings`
Expected: 201 Created with planting object

**Step 3: Commit**

```bash
git add app/api/farms/[farmId]/plantings/route.ts
git commit -m "feat(api): add plantings CRUD endpoints"
```

---

### Task 13: Planting Marker Component

**Files:**
- Create: `components/map/planting-marker.tsx`

**Step 1: Write planting marker component**

Create `components/map/planting-marker.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { Planting } from '@/lib/db/schema';

interface PlantingMarkerProps {
  planting: any; // Planting with species data joined
  map: maplibregl.Map;
  currentYear?: number;
  onClick?: (planting: any) => void;
}

const LAYER_COLORS: Record<string, string> = {
  canopy: '#166534',
  understory: '#16a34a',
  shrub: '#22c55e',
  herbaceous: '#84cc16',
  groundcover: '#a3e635',
  vine: '#a855f7',
  root: '#78350f',
  aquatic: '#0284c7'
};

export function PlantingMarker({ planting, map, currentYear, onClick }: PlantingMarkerProps) {
  useEffect(() => {
    // Calculate current size based on years since planting
    const yearsSincePlanting = (currentYear || planting.current_year) - planting.planted_year;
    const yearsToMaturity = planting.years_to_maturity || 10;
    const growthFraction = Math.min(yearsSincePlanting / yearsToMaturity, 1);

    // Sigmoid growth curve
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
    const sizeFraction = sigmoid(growthFraction);

    const currentWidth = (planting.mature_width_ft || 10) * sizeFraction;
    const radiusMeters = (currentWidth / 2) * 0.3048; // feet to meters

    // Create circle element
    const el = document.createElement('div');
    el.className = 'planting-marker';
    el.style.width = '12px';
    el.style.height = '12px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = LAYER_COLORS[planting.layer] || '#16a34a';
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    if (onClick) {
      el.addEventListener('click', () => onClick(planting));
    }

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([planting.lng, planting.lat])
      .addTo(map);

    // Add circle for mature size visualization
    const sourceId = `planting-${planting.id}`;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [planting.lng, planting.lat]
          },
          properties: {}
        }
      });

      map.addLayer({
        id: `planting-circle-${planting.id}`,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [22, radiusMeters * 10] // Scale for zoom
            ],
            base: 2
          },
          'circle-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-opacity': 0.2,
          'circle-stroke-width': 1,
          'circle-stroke-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-stroke-opacity': 0.4
        }
      });
    }

    return () => {
      marker.remove();
      if (map.getLayer(`planting-circle-${planting.id}`)) {
        map.removeLayer(`planting-circle-${planting.id}`);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [planting, map, currentYear, onClick]);

  return null;
}
```

**Step 2: Commit**

```bash
git add components/map/planting-marker.tsx
git commit -m "feat(map): add planting marker component with growth visualization"
```

---

### Task 14: Planting Mode Integration

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add planting mode state to farm-map**

Add to `components/map/farm-map.tsx` after existing state declarations:

```typescript
// Add these imports at top
import { PlantingMarker } from './planting-marker';

// Add state
const [plantingMode, setPlantingMode] = useState(false);
const [selectedSpecies, setSelectedSpecies] = useState<any>(null);
const [plantings, setPlantings] = useState<any[]>([]);

// Add useEffect to load plantings
useEffect(() => {
  if (farmId && map.current) {
    loadPlantings();
  }
}, [farmId]);

const loadPlantings = async () => {
  try {
    const response = await fetch(`/api/farms/${farmId}/plantings`);
    const data = await response.json();
    setPlantings(data.plantings || []);
  } catch (error) {
    console.error('Failed to load plantings:', error);
  }
};

// Add planting mode click handler
const handlePlantingClick = useCallback(async (e: any) => {
  if (!plantingMode || !selectedSpecies || !map.current) return;

  const { lng, lat } = e.lngLat;

  try {
    const response = await fetch(`/api/farms/${farmId}/plantings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        species_id: selectedSpecies.id,
        lat,
        lng,
        planted_year: new Date().getFullYear()
      })
    });

    if (response.ok) {
      const data = await response.json();
      setPlantings(prev => [...prev, data.planting]);
    }
  } catch (error) {
    console.error('Failed to create planting:', error);
  }
}, [plantingMode, selectedSpecies, farmId]);

// Add to map initialization useEffect
useEffect(() => {
  // ... existing map setup ...

  if (map.current) {
    map.current.on('click', handlePlantingClick);
  }

  return () => {
    if (map.current) {
      map.current.off('click', handlePlantingClick);
    }
  };
}, [handlePlantingClick]);
```

**Step 2: Add planting mode UI**

Add button to farm-map controls:

```typescript
{/* Add Planting Mode Button */}
<Button
  onClick={() => setPlantingMode(!plantingMode)}
  variant={plantingMode ? 'default' : 'outline'}
  className={plantingMode ? 'bg-green-600' : ''}
>
  {plantingMode ? 'Exit Planting Mode' : 'Add Plantings'}
</Button>
```

**Step 3: Render planting markers**

Add inside the map container div:

```typescript
{/* Render planting markers */}
{map.current && plantings.map(planting => (
  <PlantingMarker
    key={planting.id}
    planting={planting}
    map={map.current!}
    onClick={(p) => {
      console.log('Clicked planting:', p);
      // TODO: Show detail popup
    }}
  />
))}
```

**Step 4: Test planting mode**

Run: Visit farm editor, click "Add Plantings", click map
Expected: Can place plant markers on map

**Step 5: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(map): integrate planting mode with click-to-place workflow"
```

---

## PHASE 5: AI Enhancement

### Task 15: Native Species in AI Context

**Files:**
- Modify: `app/(app)/farm/[id]/farm-editor-client.tsx`

**Step 1: Add native species fetcher**

Add to `farm-editor-client.tsx`:

```typescript
const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);

useEffect(() => {
  if (farm?.id) {
    loadNativeSpecies();
  }
}, [farm?.id]);

const loadNativeSpecies = async () => {
  try {
    const response = await fetch(`/api/farms/${farm.id}/native-species`);
    const data = await response.json();
    // Get top 10 perfect matches for AI context
    setNativeSpecies(data.perfect_match.slice(0, 10));
  } catch (error) {
    console.error('Failed to load native species:', error);
  }
};
```

**Step 2: Build native species context**

Add helper function:

```typescript
const buildNativeSpeciesContext = useCallback(() => {
  if (nativeSpecies.length === 0) {
    return 'No native species data available yet.';
  }

  const speciesList = nativeSpecies.map(s => {
    const functions = s.permaculture_functions
      ? JSON.parse(s.permaculture_functions).join(', ')
      : '';

    const zones = s.min_hardiness_zone && s.max_hardiness_zone
      ? `Zones ${s.min_hardiness_zone}-${s.max_hardiness_zone}`
      : '';

    return `  - ${s.common_name} (${s.scientific_name}): ${s.layer}, ${s.mature_height_ft}ft, ${zones}, functions: ${functions}`;
  }).join('\n');

  return `
Native Species Available for This Farm (Perfect Matches):
${speciesList}

When suggesting plants, prioritize these natives and explain their permaculture functions.
  `.trim();
}, [nativeSpecies]);
```

**Step 3: Add to AI request**

Modify AI analysis request to include native context:

```typescript
body: JSON.stringify({
  farmId: farm.id,
  conversationId,
  query,
  screenshots: [
    { type: originalLayer, data: currentLayerScreenshot },
    { type: topoLayer, data: topoScreenshot },
  ],
  mapLayer: currentMapLayer,
  legendContext: buildLegendContext(),
  nativeSpeciesContext: buildNativeSpeciesContext(), // Add this
  zones: zones.map((zone) => { /* ... */ }),
}),
```

**Step 4: Update AI API to use native context**

Modify `app/api/ai/analyze/route.ts`:

```typescript
// Add to request body parsing
const { nativeSpeciesContext } = await request.json();

// Add to system prompt
const systemPrompt = `${basePrompt}

${legendContext}

${nativeSpeciesContext}

Always prioritize native species in your recommendations. When suggesting non-natives, explain why and mark them clearly as [NON-NATIVE].
`;
```

**Step 5: Test AI with native context**

Run: Ask AI "What should I plant in Zone 2?"
Expected: AI recommends from native species list with explanations

**Step 6: Commit**

```bash
git add app/(app)/farm/[id]/farm-editor-client.tsx app/api/ai/analyze/route.ts
git commit -m "feat(ai): integrate native species recommendations into AI context"
```

---

## PHASE 6: Polish & Documentation

### Task 16: Species Detail Modal

**Files:**
- Create: `components/species/species-detail-modal.tsx`

**Step 1: Write species detail modal**

Create `components/species/species-detail-modal.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Species } from '@/lib/db/schema';

interface SpeciesDetailModalProps {
  speciesId: string | null;
  onClose: () => void;
  onAddToFarm?: (species: Species) => void;
}

export function SpeciesDetailModal({ speciesId, onClose, onAddToFarm }: SpeciesDetailModalProps) {
  const [species, setSpecies] = useState<Species | null>(null);
  const [companions, setCompanions] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (speciesId) {
      loadSpeciesDetail();
    }
  }, [speciesId]);

  const loadSpeciesDetail = async () => {
    if (!speciesId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/species/${speciesId}`);
      const data = await response.json();
      setSpecies(data.species);
      setCompanions(data.companions || []);
    } catch (error) {
      console.error('Failed to load species detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!speciesId) return null;

  const functions = species?.permaculture_functions
    ? JSON.parse(species.permaculture_functions)
    : [];

  const edibleParts = species?.edible_parts
    ? JSON.parse(species.edible_parts)
    : {};

  return (
    <Dialog open={!!speciesId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {loading || !species ? (
          <div className="py-12 text-center">Loading...</div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl">{species.common_name}</DialogTitle>
                  <p className="text-muted-foreground italic">{species.scientific_name}</p>
                </div>
                {species.is_native === 1 && (
                  <Badge variant="default" className="bg-green-600">Native</Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Layer</div>
                  <div className="font-medium capitalize">{species.layer}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mature Size</div>
                  <div className="font-medium">
                    {species.mature_height_ft}ft H × {species.mature_width_ft}ft W
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Hardiness Zones</div>
                  <div className="font-medium">
                    {species.min_hardiness_zone}-{species.max_hardiness_zone}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Years to Maturity</div>
                  <div className="font-medium">{species.years_to_maturity || 'N/A'}</div>
                </div>
              </div>

              {/* Description */}
              {species.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm">{species.description}</p>
                </div>
              )}

              {/* Permaculture Functions */}
              {functions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Permaculture Functions</h3>
                  <div className="flex flex-wrap gap-2">
                    {functions.map((fn: string) => (
                      <Badge key={fn} variant="secondary">
                        {fn.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone Placement */}
              {species.zone_placement_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Zone Placement</h3>
                  <p className="text-sm">{species.zone_placement_notes}</p>
                </div>
              )}

              {/* Edible Parts */}
              {Object.keys(edibleParts).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Edible Parts</h3>
                  <ul className="text-sm space-y-1">
                    {Object.entries(edibleParts).map(([part, timing]) => (
                      <li key={part}>
                        <span className="font-medium capitalize">{part}:</span> {timing as string}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Companion Plants */}
              {companions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Companion Plants</h3>
                  <div className="flex flex-wrap gap-2">
                    {companions.map(c => (
                      <Badge key={c.id} variant="outline">
                        {c.common_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sourcing */}
              {species.sourcing_notes && (
                <div>
                  <h3 className="font-semibold mb-2">Where to Source</h3>
                  <p className="text-sm">{species.sourcing_notes}</p>
                </div>
              )}

              {/* Action Button */}
              {onAddToFarm && (
                <Button
                  onClick={() => onAddToFarm(species)}
                  className="w-full"
                  size="lg"
                >
                  Add This Plant to My Farm
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Integrate with catalog page**

Update `app/(app)/plants/page.tsx`:

```typescript
import { SpeciesDetailModal } from '@/components/species/species-detail-modal';

// Add state
const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

// Update SpeciesCard onClick
<SpeciesCard
  key={s.id}
  species={s}
  onClick={() => setSelectedSpeciesId(s.id)}
/>

// Add modal at end of component
<SpeciesDetailModal
  speciesId={selectedSpeciesId}
  onClose={() => setSelectedSpeciesId(null)}
/>
```

**Step 3: Test modal**

Run: Click species card in catalog
Expected: Modal opens with full species details

**Step 4: Commit**

```bash
git add components/species/species-detail-modal.tsx app/(app)/plants/page.tsx
git commit -m "feat(ui): add comprehensive species detail modal"
```

---

### Task 17: Update Navigation

**Files:**
- Modify: `app/(app)/layout.tsx` or navigation component

**Step 1: Add Plants link to sidebar**

Add to sidebar navigation:

```typescript
{
  name: 'Plants',
  href: '/plants',
  icon: Leaf, // Import from lucide-react
}
```

**Step 2: Test navigation**

Run: Click Plants in sidebar
Expected: Navigate to plants catalog

**Step 3: Commit**

```bash
git add app/(app)/layout.tsx
git commit -m "feat(nav): add Plants catalog to main navigation"
```

---

### Task 18: Documentation & Push

**Files:**
- Create: `docs/NATIVE_SPECIES_GUIDE.md`

**Step 1: Write user guide**

Create `docs/NATIVE_SPECIES_GUIDE.md`:

```markdown
# Native Species Index - User Guide

## Overview

The Native Species Index helps you discover, learn about, and plant native species suited to your farm's location and climate.

## Features

### 1. Global Plant Catalog

Browse all available species at `/plants` with:
- Filter by native status, layer, and permaculture functions
- Search by common or scientific name
- View detailed information for each species

### 2. Farm-Specific Recommendations

When editing a farm, get personalized recommendations:
- **Perfect Match**: Native to your region AND hardiness zone
- **Good Match**: Native with zone OR region match
- **Possible**: Non-native but climate compatible

### 3. Planting Mode

Add plants to your farm map:
1. Click "Add Plantings" button
2. Select a species
3. Click map location to place
4. Fill in optional details (name, year, notes)

Plantings display as color-coded markers sized by mature width.

### 4. AI Integration

The AI has access to your farm's native species list and will prioritize natives in recommendations.

## Permaculture Functions

Species are tagged with functions:
- `nitrogen_fixer`: Enriches soil
- `wildlife_habitat`: Food/shelter for wildlife
- `edible_fruit`: Human food production
- `pollinator_support`: Attracts beneficial insects
- `erosion_control`: Stabilizes soil

## Data Sources

Initial species data comes from:
- Eastern US native plant guides
- Permaculture guild resources
- USDA Plants Database

Data grows through:
- Community contributions
- AI-generated descriptions
- Usage analytics

## Future Features

- Nursery marketplace integration
- Planting journals with photos
- Performance tracking by region
- Guild templates
```

**Step 2: Commit and push all work**

```bash
git add docs/NATIVE_SPECIES_GUIDE.md
git commit -m "docs: add native species user guide"
git push origin main
```

---

## Execution Complete

All phases implemented:
- ✅ Phase 1: Database foundation with species enhancements, region mapping, native matching
- ✅ Phase 2: API endpoints for species catalog and farm recommendations
- ✅ Phase 3: Global plants catalog UI with filtering and search
- ✅ Phase 4: Planting mode with map markers and CRUD
- ✅ Phase 5: AI integration with native species context
- ✅ Phase 6: Species detail modal, navigation, documentation

## Testing Checklist

- [ ] Database migration successful
- [ ] Species API returns filtered results
- [ ] Farm native species API returns perfect/good/possible matches
- [ ] Global catalog page loads and filters work
- [ ] Species detail modal displays all info
- [ ] Planting mode places markers on map
- [ ] Plantings persist to database
- [ ] AI includes native species in recommendations
- [ ] Navigation to /plants works
- [ ] All tests pass: `npm test`

## Next Steps (Future Enhancements)

1. Add species photos (Phase 2+)
2. Community contribution workflow
3. Nursery directory and marketplace
4. Guild templates
5. Planting journals with progress photos
6. Mobile app for field identification
