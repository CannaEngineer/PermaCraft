# Elite Varieties Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a comprehensive elite/award-winning varieties database to help users choose the best cultivars of each species, with detailed characteristic information and sourcing notes.

**Architecture:** New database table for varieties linked to species, variety detail modal, award/certification system, characteristic badges, integration with planting flow.

**Tech Stack:** Turso database, React components, shadcn/ui, search/filter utilities

---

## Current System Analysis

**Current Implementation:**
- Species table: `lib/db/schema.ts:46-77` has basic species info
- No variety-level data exists
- Planting flow: Users select species but not specific varieties
- Species detail shown in species picker panels

**User Need:**
- "I know I want an apple tree, but which variety?"
- "What makes 'Honeycrisp' better than other apples?"
- "Which varieties have won awards?"
- "Where can I buy these elite varieties?"

---

## Task 1: Database Schema for Varieties

**Files:**
- Create: `lib/db/migrations/060_plant_varieties.sql`
- Modify: `lib/db/schema.ts` (add Variety interface)

**Step 1: Create migration**

```sql
-- lib/db/migrations/060_plant_varieties.sql
-- Plant varieties: cultivars, hybrids, and named selections

CREATE TABLE IF NOT EXISTS plant_varieties (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,

  -- Identity
  variety_name TEXT NOT NULL, -- 'Honeycrisp', 'Liberty', 'Enterprise'
  common_aliases TEXT, -- JSON array ['Honeycrunch', 'Honey Crisp']
  patent_number TEXT, -- Plant patent if applicable
  introduction_year INTEGER, -- Year introduced/released

  -- Classification
  variety_type TEXT NOT NULL DEFAULT 'cultivar', -- 'cultivar', 'hybrid', 'heirloom', 'wild_selection'
  breeding_program TEXT, -- 'University of Minnesota', 'Stark Bros'

  -- Elite characteristics (JSON object)
  elite_characteristics TEXT, -- {"disease_resistance": ["scab", "fire_blight"], "flavor_profile": "sweet-tart", "storage_life": "excellent"}

  -- Awards & certifications (JSON array)
  awards TEXT, -- [{"name": "All-America Selections Winner", "year": 1985, "organization": "AAS"}]

  -- Performance data
  hardiness_zone_min TEXT,
  hardiness_zone_max TEXT,
  chill_hours_required INTEGER, -- For fruit trees
  days_to_maturity INTEGER, -- For annuals/vegetables
  yield_rating TEXT, -- 'low', 'medium', 'high', 'exceptional'

  -- Descriptive
  description TEXT,
  flavor_notes TEXT, -- For edibles
  color_description TEXT,
  size_description TEXT, -- 'large', 'medium', 'compact'

  -- Sourcing
  sourcing_notes TEXT, -- Where to buy, common nurseries
  average_price_usd REAL, -- Ballpark price
  availability TEXT, -- 'common', 'specialty', 'rare'

  -- Photos
  image_url TEXT, -- Main variety photo
  gallery_urls TEXT, -- JSON array of additional photos

  -- Ratings
  user_rating_avg REAL, -- Aggregated user ratings
  expert_rating INTEGER, -- 1-10 expert rating
  popularity_score INTEGER DEFAULT 0, -- Track selection count

  -- Meta
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  created_by TEXT, -- User ID who added it

  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_varieties_species ON plant_varieties(species_id);
CREATE INDEX IF NOT EXISTS idx_varieties_type ON plant_varieties(variety_type);
CREATE INDEX IF NOT EXISTS idx_varieties_rating ON plant_varieties(expert_rating DESC);

-- Sample data: Apple varieties
INSERT INTO plant_varieties (
  id,
  species_id,
  variety_name,
  variety_type,
  breeding_program,
  elite_characteristics,
  awards,
  description,
  flavor_notes,
  hardiness_zone_min,
  hardiness_zone_max,
  chill_hours_required,
  sourcing_notes,
  availability,
  expert_rating
) VALUES (
  'var-apple-honeycrisp',
  (SELECT id FROM species WHERE common_name = 'Apple' LIMIT 1),
  'Honeycrisp',
  'cultivar',
  'University of Minnesota',
  '{"disease_resistance": ["scab_moderate"], "storage_life": "excellent", "texture": "exceptionally_crisp", "cold_hardy": true}',
  '[{"name": "Best Apple Variety", "year": 2004, "organization": "American Pomological Society"}]',
  'Explosively crisp texture with balanced sweet-tart flavor. Excellent storage life and cold hardiness.',
  'Sweet-tart, honey notes, exceptionally juicy',
  '3',
  '8',
  800,
  'Widely available at nurseries. Try Stark Bros, Raintree Nursery, local garden centers.',
  'common',
  9
);

-- More varieties...
-- (Would include Liberty, Enterprise, Gold Rush, etc.)
```

**Step 2: Create TypeScript interface**

```typescript
// Add to lib/db/schema.ts
export interface PlantVariety {
  id: string;
  species_id: string;

  // Identity
  variety_name: string;
  common_aliases: string | null; // JSON array
  patent_number: string | null;
  introduction_year: number | null;

  // Classification
  variety_type: 'cultivar' | 'hybrid' | 'heirloom' | 'wild_selection';
  breeding_program: string | null;

  // Elite characteristics
  elite_characteristics: string | null; // JSON object
  awards: string | null; // JSON array

  // Performance
  hardiness_zone_min: string | null;
  hardiness_zone_max: string | null;
  chill_hours_required: number | null;
  days_to_maturity: number | null;
  yield_rating: 'low' | 'medium' | 'high' | 'exceptional' | null;

  // Descriptive
  description: string | null;
  flavor_notes: string | null;
  color_description: string | null;
  size_description: string | null;

  // Sourcing
  sourcing_notes: string | null;
  average_price_usd: number | null;
  availability: 'common' | 'specialty' | 'rare' | null;

  // Photos
  image_url: string | null;
  gallery_urls: string | null; // JSON array

  // Ratings
  user_rating_avg: number | null;
  expert_rating: number | null;
  popularity_score: number;

  // Meta
  created_at: number;
  updated_at: number;
  created_by: string | null;
}

// Expanded interface with species info joined
export interface PlantVarietyWithSpecies extends PlantVariety {
  species_common_name: string;
  species_scientific_name: string;
  species_layer: string;
}
```

**Step 3: Apply migration**

```bash
npx tsx scripts/run-migration.ts 060_plant_varieties.sql
```

**Step 4: Commit schema**

```bash
git add lib/db/migrations/060_plant_varieties.sql lib/db/schema.ts
git commit -m "feat(varieties): add plant varieties database schema"
```

---

## Task 2: Variety Query Utilities

**Files:**
- Create: `lib/varieties/variety-queries.ts`

**Step 1: Create query helpers**

```typescript
// lib/varieties/variety-queries.ts
import { db } from '@/lib/db';
import type { PlantVariety, PlantVarietyWithSpecies } from '@/lib/db/schema';

/**
 * Get all varieties for a species
 */
export async function getVarietiesBySpecies(speciesId: string): Promise<PlantVarietyWithSpecies[]> {
  const result = await db.execute({
    sql: `SELECT
            v.*,
            s.common_name as species_common_name,
            s.scientific_name as species_scientific_name,
            s.layer as species_layer
          FROM plant_varieties v
          JOIN species s ON v.species_id = s.id
          WHERE v.species_id = ?
          ORDER BY v.expert_rating DESC, v.variety_name ASC`,
    args: [speciesId]
  });

  return result.rows as unknown as PlantVarietyWithSpecies[];
}

/**
 * Get top-rated varieties across all species
 */
export async function getTopRatedVarieties(limit: number = 20): Promise<PlantVarietyWithSpecies[]> {
  const result = await db.execute({
    sql: `SELECT
            v.*,
            s.common_name as species_common_name,
            s.scientific_name as species_scientific_name,
            s.layer as species_layer
          FROM plant_varieties v
          JOIN species s ON v.species_id = s.id
          WHERE v.expert_rating >= 8
          ORDER BY v.expert_rating DESC, v.popularity_score DESC
          LIMIT ?`,
    args: [limit]
  });

  return result.rows as unknown as PlantVarietyWithSpecies[];
}

/**
 * Get award-winning varieties
 */
export async function getAwardWinningVarieties(): Promise<PlantVarietyWithSpecies[]> {
  const result = await db.execute({
    sql: `SELECT
            v.*,
            s.common_name as species_common_name,
            s.scientific_name as species_scientific_name,
            s.layer as species_layer
          FROM plant_varieties v
          JOIN species s ON v.species_id = s.id
          WHERE v.awards IS NOT NULL
          ORDER BY v.expert_rating DESC`,
    args: []
  });

  return result.rows as unknown as PlantVarietyWithSpecies[];
}

/**
 * Search varieties by name
 */
export async function searchVarieties(query: string): Promise<PlantVarietyWithSpecies[]> {
  const searchTerm = `%${query.toLowerCase()}%`;

  const result = await db.execute({
    sql: `SELECT
            v.*,
            s.common_name as species_common_name,
            s.scientific_name as species_scientific_name,
            s.layer as species_layer
          FROM plant_varieties v
          JOIN species s ON v.species_id = s.id
          WHERE LOWER(v.variety_name) LIKE ?
             OR LOWER(s.common_name) LIKE ?
          ORDER BY v.expert_rating DESC
          LIMIT 50`,
    args: [searchTerm, searchTerm]
  });

  return result.rows as unknown as PlantVarietyWithSpecies[];
}

/**
 * Get variety by ID
 */
export async function getVarietyById(varietyId: string): Promise<PlantVarietyWithSpecies | null> {
  const result = await db.execute({
    sql: `SELECT
            v.*,
            s.common_name as species_common_name,
            s.scientific_name as species_scientific_name,
            s.layer as species_layer
          FROM plant_varieties v
          JOIN species s ON v.species_id = s.id
          WHERE v.id = ?`,
    args: [varietyId]
  });

  return result.rows[0] as unknown as PlantVarietyWithSpecies || null;
}

/**
 * Increment popularity score when variety is selected
 */
export async function incrementVarietyPopularity(varietyId: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE plant_varieties SET popularity_score = popularity_score + 1 WHERE id = ?',
    args: [varietyId]
  });
}
```

**Step 2: Commit query utilities**

```bash
git add lib/varieties/variety-queries.ts
git commit -m "feat(varieties): add variety query utilities"
```

---

## Task 3: Variety Detail Modal Component

**Files:**
- Create: `components/varieties/variety-detail-modal.tsx`

**Step 1: Create detail modal**

```tsx
// components/varieties/variety-detail-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Star, TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react';
import type { PlantVarietyWithSpecies } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface VarietyDetailModalProps {
  variety: PlantVarietyWithSpecies;
  open: boolean;
  onClose: () => void;
  onSelect?: (variety: PlantVarietyWithSpecies) => void;
}

export function VarietyDetailModal({
  variety,
  open,
  onClose,
  onSelect
}: VarietyDetailModalProps) {
  // Parse JSON fields
  const characteristics = variety.elite_characteristics
    ? JSON.parse(variety.elite_characteristics)
    : {};

  const awards = variety.awards
    ? JSON.parse(variety.awards)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {variety.species_common_name} '{variety.variety_name}'
              </DialogTitle>
              <p className="text-sm text-muted-foreground italic mt-1">
                {variety.species_scientific_name}
              </p>
            </div>

            {variety.expert_rating && (
              <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="font-bold text-primary">
                  {variety.expert_rating}/10
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          {variety.image_url && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={variety.image_url}
                alt={variety.variety_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Type & breeding info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {variety.variety_type.replace('_', ' ')}
            </Badge>
            {variety.breeding_program && (
              <Badge variant="outline">
                {variety.breeding_program}
              </Badge>
            )}
            {variety.introduction_year && (
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                Introduced {variety.introduction_year}
              </Badge>
            )}
          </div>

          {/* Description */}
          {variety.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{variety.description}</p>
            </div>
          )}

          {/* Elite characteristics */}
          {Object.keys(characteristics).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Elite Characteristics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(characteristics).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600" />
                Awards & Recognition
              </h3>
              <div className="space-y-2">
                {awards.map((award: any, i: number) => (
                  <div key={i} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="font-medium text-sm">{award.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {award.organization} • {award.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flavor notes (for edibles) */}
          {variety.flavor_notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Flavor Profile</h3>
              <p className="text-sm text-muted-foreground">{variety.flavor_notes}</p>
            </div>
          )}

          {/* Hardiness & performance */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {variety.hardiness_zone_min && variety.hardiness_zone_max && (
              <div>
                <div className="text-muted-foreground">Hardiness Zones</div>
                <div className="font-medium">
                  {variety.hardiness_zone_min} - {variety.hardiness_zone_max}
                </div>
              </div>
            )}

            {variety.yield_rating && (
              <div>
                <div className="text-muted-foreground">Yield</div>
                <div className="font-medium capitalize">{variety.yield_rating}</div>
              </div>
            )}

            {variety.chill_hours_required && (
              <div>
                <div className="text-muted-foreground">Chill Hours</div>
                <div className="font-medium">{variety.chill_hours_required} hours</div>
              </div>
            )}

            {variety.availability && (
              <div>
                <div className="text-muted-foreground">Availability</div>
                <div className="font-medium capitalize">{variety.availability}</div>
              </div>
            )}
          </div>

          {/* Sourcing */}
          {variety.sourcing_notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Where to Buy
              </h3>
              <p className="text-sm text-muted-foreground">{variety.sourcing_notes}</p>
              {variety.average_price_usd && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Typical price: ${variety.average_price_usd}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {onSelect && (
            <Button onClick={() => onSelect(variety)} className="flex-1">
              Select This Variety
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit variety modal**

```bash
git add components/varieties/variety-detail-modal.tsx
git commit -m "feat(varieties): add variety detail modal component"
```

---

## Task 4: Variety Picker in Species Selection

**Files:**
- Modify: `components/map/species-picker-panel.tsx`
- Create: `components/varieties/variety-selector.tsx`

**Step 1: Create variety selector component**

```tsx
// components/varieties/variety-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Star, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlantVarietyWithSpecies } from '@/lib/db/schema';
import { VarietyDetailModal } from './variety-detail-modal';

interface VarietySelectorProps {
  speciesId: string;
  speciesName: string;
  onSelectVariety: (variety: PlantVarietyWithSpecies) => void;
  onSkip: () => void;
}

export function VarietySelector({
  speciesId,
  speciesName,
  onSelectVariety,
  onSkip
}: VarietySelectorProps) {
  const [varieties, setVarieties] = useState<PlantVarietyWithSpecies[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<PlantVarietyWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVarieties();
  }, [speciesId]);

  const loadVarieties = async () => {
    try {
      const response = await fetch(`/api/species/${speciesId}/varieties`);
      const data = await response.json();
      setVarieties(data.varieties || []);
    } catch (error) {
      console.error('Failed to load varieties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading varieties...</div>;
  }

  if (varieties.length === 0) {
    // No varieties available, auto-skip
    onSkip();
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Choose a {speciesName} Variety</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a specific cultivar or skip to use general species
        </p>
      </div>

      {/* Variety grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {varieties.map(variety => {
          const hasAwards = variety.awards && JSON.parse(variety.awards).length > 0;

          return (
            <button
              key={variety.id}
              onClick={() => setSelectedVariety(variety)}
              className="text-left p-3 bg-card border border-border rounded-lg hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{variety.variety_name}</div>
                  {variety.variety_type && (
                    <div className="text-xs text-muted-foreground capitalize mt-1">
                      {variety.variety_type.replace('_', ' ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasAwards && (
                    <Award className="h-4 w-4 text-yellow-600" />
                  )}
                  {variety.expert_rating && (
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                      <Star className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-xs font-bold text-primary">
                        {variety.expert_rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {variety.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {variety.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip (Use General Species)
        </Button>
      </div>

      {/* Detail modal */}
      {selectedVariety && (
        <VarietyDetailModal
          variety={selectedVariety}
          open={!!selectedVariety}
          onClose={() => setSelectedVariety(null)}
          onSelect={(v) => {
            onSelectVariety(v);
            setSelectedVariety(null);
          }}
        />
      )}
    </div>
  );
}
```

**Step 2: Integrate with species picker**

```tsx
// In species-picker-panel.tsx, add variety selection step:
// After user selects a species, show VarietySelector before finalizing

import { VarietySelector } from '@/components/varieties/variety-selector';

// Add state for variety selection flow:
const [showVarietySelector, setShowVarietySelector] = useState(false);
const [selectedSpeciesForVariety, setSelectedSpeciesForVariety] = useState<Species | null>(null);

// Modify onSelectSpecies to show variety selector:
const handleSpeciesClick = (species: Species) => {
  setSelectedSpeciesForVariety(species);
  setShowVarietySelector(true);
};

// Render variety selector:
{showVarietySelector && selectedSpeciesForVariety && (
  <VarietySelector
    speciesId={selectedSpeciesForVariety.id}
    speciesName={selectedSpeciesForVariety.common_name}
    onSelectVariety={(variety) => {
      // Call original onSelectSpecies with variety info
      onSelectSpecies({
        ...selectedSpeciesForVariety,
        selectedVariety: variety // Add variety to species data
      });
      setShowVarietySelector(false);
    }}
    onSkip={() => {
      // Use species without variety
      onSelectSpecies(selectedSpeciesForVariety);
      setShowVarietySelector(false);
    }}
  />
)}
```

**Step 3: Commit variety picker integration**

```bash
git add components/varieties/variety-selector.tsx components/map/species-picker-panel.tsx
git commit -m "feat(varieties): integrate variety picker with species selection"
```

---

## Task 5: Variety API Endpoints

**Files:**
- Create: `app/api/species/[id]/varieties/route.ts`
- Create: `app/api/varieties/[id]/route.ts`

**Step 1: Create species varieties endpoint**

```typescript
// app/api/species/[id]/varieties/route.ts
import { db } from '@/lib/db';
import { getVarietiesBySpecies } from '@/lib/varieties/variety-queries';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speciesId } = await context.params;

    const varieties = await getVarietiesBySpecies(speciesId);

    return Response.json({ varieties });
  } catch (error) {
    console.error('Get varieties error:', error);
    return Response.json({ error: 'Failed to get varieties' }, { status: 500 });
  }
}
```

**Step 2: Create variety detail endpoint**

```typescript
// app/api/varieties/[id]/route.ts
import { getVarietyById, incrementVarietyPopularity } from '@/lib/varieties/variety-queries';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: varietyId } = await context.params;

    const variety = await getVarietyById(varietyId);

    if (!variety) {
      return Response.json({ error: 'Variety not found' }, { status: 404 });
    }

    return Response.json({ variety });
  } catch (error) {
    console.error('Get variety error:', error);
    return Response.json({ error: 'Failed to get variety' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: varietyId } = await context.params;

    // Increment popularity when selected
    await incrementVarietyPopularity(varietyId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Increment popularity error:', error);
    return Response.json({ error: 'Failed to track selection' }, { status: 500 });
  }
}
```

**Step 3: Commit API endpoints**

```bash
git add app/api/species/[id]/varieties/ app/api/varieties/[id]/
git commit -m "feat(varieties): add variety API endpoints"
```

---

## Task 6: Seed Data for Common Varieties

**Files:**
- Create: `scripts/seed-elite-varieties.ts`

**Step 1: Create seed script**

```typescript
// scripts/seed-elite-varieties.ts
import { db } from '@/lib/db';

const ELITE_VARIETIES = [
  // Apple varieties
  {
    species_common: 'Apple',
    variety_name: 'Honeycrisp',
    variety_type: 'cultivar',
    breeding_program: 'University of Minnesota',
    description: 'Explosively crisp texture with balanced sweet-tart flavor...',
    elite_characteristics: {
      disease_resistance: ['scab_moderate'],
      storage_life: 'excellent',
      texture: 'exceptionally_crisp'
    },
    awards: [
      { name: 'Best Apple Variety', year: 2004, organization: 'APS' }
    ],
    expert_rating: 9
  },
  // More varieties...
];

async function seedVarieties() {
  console.log('Seeding elite varieties...');

  for (const variety of ELITE_VARIETIES) {
    // Get species ID
    const speciesResult = await db.execute({
      sql: 'SELECT id FROM species WHERE common_name = ? LIMIT 1',
      args: [variety.species_common]
    });

    if (speciesResult.rows.length === 0) {
      console.log(`Species not found: ${variety.species_common}`);
      continue;
    }

    const speciesId = speciesResult.rows[0].id;

    // Insert variety
    await db.execute({
      sql: `INSERT INTO plant_varieties
            (id, species_id, variety_name, variety_type, breeding_program,
             description, elite_characteristics, awards, expert_rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        speciesId,
        variety.variety_name,
        variety.variety_type,
        variety.breeding_program,
        variety.description,
        JSON.stringify(variety.elite_characteristics),
        JSON.stringify(variety.awards),
        variety.expert_rating
      ]
    });

    console.log(`✓ Seeded: ${variety.variety_name}`);
  }

  console.log('Done!');
}

seedVarieties().then(() => process.exit(0));
```

**Step 2: Commit seed script**

```bash
git add scripts/seed-elite-varieties.ts
git commit -m "feat(varieties): add elite varieties seed script"
```

---

## Testing Checklist

- [ ] Varieties load for species
- [ ] Detail modal shows all info
- [ ] Awards render correctly
- [ ] Characteristics display properly
- [ ] Select variety flows to planting
- [ ] Skip variety continues with species
- [ ] API endpoints return data
- [ ] Seed script populates database

---

## Success Metrics

- **Adoption:** 40% of users select specific varieties
- **Value:** User survey "varieties helpful" >4.5/5
- **Database:** 200+ elite varieties seeded
- **Engagement:** Variety detail views >1000/week
