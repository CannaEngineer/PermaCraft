# Track 4: Advanced Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Guild Builder for AI-assisted polyculture design and Offline Mode for field work without internet.

**Architecture:** Create `guild_templates` table with companion planting rules, implement AI-powered guild suggestion API using OpenRouter, build drag-and-drop guild designer UI. Add Service Worker for offline caching, IndexedDB for local data storage, and sync queue for offline changes.

**Tech Stack:** OpenRouter (AI suggestions), Workbox (Service Worker), IndexedDB (offline storage), React DnD (drag-drop), Turf.js (spatial calculations)

---

## Prerequisites

- Track 1 completed (design layers)
- Track 2 completed (plantings, species data)
- OpenRouter API configured
- Existing species database populated

---

## Part 1: Guild Builder System

### Task 1: Database Schema - Guild Templates

**Files:**
- Create: `lib/db/migrations/035_guild_templates.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/035_guild_templates.sql`:

```sql
CREATE TABLE IF NOT EXISTS guild_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  climate_zones TEXT,
  focal_species_id TEXT NOT NULL,
  companion_species TEXT NOT NULL,
  spacing_rules TEXT,
  benefits TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (focal_species_id) REFERENCES species(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_guild_templates_focal ON guild_templates(focal_species_id);
CREATE INDEX IF NOT EXISTS idx_guild_templates_public ON guild_templates(is_public);

-- climate_zones: JSON ["5a", "5b", "6a", "6b"]
-- companion_species: JSON [{"species_id":"...", "layer":"understory", "min_distance_feet":3, "max_distance_feet":10, "count":3}]
-- spacing_rules: JSON {"canopy_radius_feet":15, "understory_radius_feet":8}
-- benefits: JSON ["nitrogen_fixation", "pest_control", "pollinator_attraction"]
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/035_guild_templates.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface GuildTemplate {
  id: string;
  name: string;
  description: string | null;
  climate_zones: string | null; // JSON string array
  focal_species_id: string;
  companion_species: string; // JSON CompanionSpecies[]
  spacing_rules: string | null; // JSON SpacingRules
  benefits: string | null; // JSON string array
  is_public: number; // SQLite boolean
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface CompanionSpecies {
  species_id: string;
  layer: string;
  min_distance_feet: number;
  max_distance_feet: number;
  count: number;
  cardinal_direction?: 'N' | 'S' | 'E' | 'W' | 'any';
}

export interface SpacingRules {
  canopy_radius_feet: number;
  understory_radius_feet?: number;
  shrub_radius_feet?: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/035_guild_templates.sql lib/db/schema.ts
git commit -m "feat(guilds): add guild templates schema

- Guild metadata with focal species
- Companion species with spacing rules
- Climate zone filtering
- Public/private templates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Seed Guild Templates Data

**Files:**
- Create: `data/seed-guilds.ts`
- Create: `scripts/seed-guilds.ts`

**Step 1: Create seed data**

Create `data/seed-guilds.ts`:

```typescript
export const sampleGuildTemplates = [
  {
    id: 'guild-apple-standard',
    name: 'Apple Tree Guild (Standard)',
    description: 'Traditional apple tree polyculture with nitrogen fixers, pest deterrents, and groundcover',
    climate_zones: ['5a', '5b', '6a', '6b', '7a', '7b'],
    focal_species_name: 'Apple (Malus domestica)',
    companion_species: [
      {
        species_name: 'White Clover (Trifolium repens)',
        layer: 'groundcover',
        min_distance_feet: 0,
        max_distance_feet: 15,
        count: 1, // Blanket coverage
        cardinal_direction: 'any'
      },
      {
        species_name: 'Comfrey (Symphytum officinale)',
        layer: 'herbaceous',
        min_distance_feet: 3,
        max_distance_feet: 8,
        count: 4,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Chives (Allium schoenoprasum)',
        layer: 'herbaceous',
        min_distance_feet: 2,
        max_distance_feet: 5,
        count: 6,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Nasturtium (Tropaeolum majus)',
        layer: 'groundcover',
        min_distance_feet: 1,
        max_distance_feet: 10,
        count: 3,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 15,
      understory_radius_feet: 8
    },
    benefits: [
      'nitrogen_fixation',
      'pest_control',
      'pollinator_attraction',
      'dynamic_accumulator',
      'mulch_production'
    ]
  },
  {
    id: 'guild-peach-warm',
    name: 'Peach Tree Guild (Warm Climate)',
    description: 'Peach polyculture optimized for zones 7-9 with heat-tolerant companions',
    climate_zones: ['7a', '7b', '8a', '8b', '9a', '9b'],
    focal_species_name: 'Peach (Prunus persica)',
    companion_species: [
      {
        species_name: 'Yarrow (Achillea millefolium)',
        layer: 'herbaceous',
        min_distance_feet: 2,
        max_distance_feet: 10,
        count: 5,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Lavender (Lavandula angustifolia)',
        layer: 'shrub',
        min_distance_feet: 4,
        max_distance_feet: 8,
        count: 3,
        cardinal_direction: 'S'
      },
      {
        species_name: 'Strawberry (Fragaria × ananassa)',
        layer: 'groundcover',
        min_distance_feet: 1,
        max_distance_feet: 12,
        count: 1,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 12,
      understory_radius_feet: 6
    },
    benefits: [
      'pest_control',
      'pollinator_attraction',
      'erosion_control',
      'edible_yield'
    ]
  },
  {
    id: 'guild-oak-native',
    name: 'Oak Savanna Guild (Native)',
    description: 'Native oak ecosystem with native understory for wildlife habitat',
    climate_zones: ['4a', '4b', '5a', '5b', '6a', '6b', '7a'],
    focal_species_name: 'White Oak (Quercus alba)',
    companion_species: [
      {
        species_name: 'American Hazelnut (Corylus americana)',
        layer: 'shrub',
        min_distance_feet: 10,
        max_distance_feet: 20,
        count: 3,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Wild Bergamot (Monarda fistulosa)',
        layer: 'herbaceous',
        min_distance_feet: 5,
        max_distance_feet: 15,
        count: 8,
        cardinal_direction: 'any'
      },
      {
        species_name: 'Pennsylvania Sedge (Carex pensylvanica)',
        layer: 'groundcover',
        min_distance_feet: 0,
        max_distance_feet: 25,
        count: 1,
        cardinal_direction: 'any'
      }
    ],
    spacing_rules: {
      canopy_radius_feet: 40,
      understory_radius_feet: 20,
      shrub_radius_feet: 8
    },
    benefits: [
      'wildlife_habitat',
      'native_ecology',
      'edible_yield',
      'erosion_control'
    ]
  }
];
```

**Step 2: Create seed script**

Create `scripts/seed-guilds.ts`:

```typescript
import { db } from '@/lib/db';
import { sampleGuildTemplates } from '@/data/seed-guilds';

async function seedGuildTemplates() {
  console.log('Seeding guild templates...');

  // Get species IDs from names
  const allSpecies = await db.execute({
    sql: 'SELECT id, scientific_name, common_name FROM species'
  });

  const speciesMap = new Map();
  allSpecies.rows.forEach(row => {
    const key = row.common_name || row.scientific_name;
    speciesMap.set(key, row.id);
  });

  for (const template of sampleGuildTemplates) {
    // Find focal species ID
    const focalSpeciesId = speciesMap.get(template.focal_species_name);
    if (!focalSpeciesId) {
      console.warn(`Focal species not found: ${template.focal_species_name}`);
      continue;
    }

    // Map companion species names to IDs
    const companionSpecies = template.companion_species.map(comp => {
      const speciesId = speciesMap.get(comp.species_name);
      if (!speciesId) {
        console.warn(`Companion species not found: ${comp.species_name}`);
        return null;
      }

      return {
        species_id: speciesId,
        layer: comp.layer,
        min_distance_feet: comp.min_distance_feet,
        max_distance_feet: comp.max_distance_feet,
        count: comp.count,
        cardinal_direction: comp.cardinal_direction
      };
    }).filter(Boolean);

    // Insert guild template
    await db.execute({
      sql: `INSERT INTO guild_templates
            (id, name, description, climate_zones, focal_species_id, companion_species, spacing_rules, benefits, is_public, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        template.id,
        template.name,
        template.description,
        JSON.stringify(template.climate_zones),
        focalSpeciesId,
        JSON.stringify(companionSpecies),
        JSON.stringify(template.spacing_rules),
        JSON.stringify(template.benefits),
        1,
        'system'
      ]
    });

    console.log(`✓ Seeded: ${template.name}`);
  }

  console.log('Guild template seeding complete!');
}

seedGuildTemplates();
```

**Step 3: Commit**

```bash
git add data/seed-guilds.ts scripts/seed-guilds.ts
git commit -m "feat(guilds): add sample guild template seed data

- Apple tree standard guild
- Peach warm climate guild
- Oak savanna native guild
- Seed script with species ID mapping

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: AI Guild Suggestion API

**Files:**
- Create: `app/api/guilds/suggest/route.ts`
- Create: `lib/ai/guild-prompter.ts`

**Step 1: Create guild AI prompt builder**

Create `lib/ai/guild-prompter.ts`:

```typescript
export interface GuildSuggestionContext {
  focalSpecies: {
    scientific_name: string;
    common_name: string;
    native_region?: string;
    layer: string;
  };
  farmContext: {
    climate_zone: string;
    soil_type?: string;
    rainfall_inches?: number;
  };
  constraints?: {
    prefer_native?: boolean;
    edible_focus?: boolean;
    max_companions?: number;
  };
}

export function buildGuildSuggestionPrompt(context: GuildSuggestionContext): string {
  return `You are a permaculture design expert specializing in plant guilds. Generate a companion planting guild for the following focal species.

FOCAL SPECIES:
- Scientific Name: ${context.focalSpecies.scientific_name}
- Common Name: ${context.focalSpecies.common_name}
- Native Region: ${context.focalSpecies.native_region || 'Unknown'}
- Layer: ${context.focalSpecies.layer}

SITE CONDITIONS:
- Climate Zone: ${context.farmContext.climate_zone}
- Soil Type: ${context.farmContext.soil_type || 'Unknown'}
- Annual Rainfall: ${context.farmContext.rainfall_inches ? `${context.farmContext.rainfall_inches} inches` : 'Unknown'}

DESIGN CONSTRAINTS:
${context.constraints?.prefer_native ? '- Prefer native species to the region' : ''}
${context.constraints?.edible_focus ? '- Emphasize edible companions' : ''}
${context.constraints?.max_companions ? `- Maximum ${context.constraints.max_companions} companion species` : ''}

Please suggest 3-6 companion species that would form a beneficial guild. For each companion, provide:
1. Scientific name
2. Common name
3. Layer (canopy, understory, shrub, herbaceous, groundcover, vine)
4. Primary benefit (nitrogen fixation, pest control, pollinator attraction, dynamic accumulator, mulch production, etc.)
5. Recommended spacing from focal species (in feet)
6. Quantity to plant
7. Brief explanation of why this species works well

Format your response as valid JSON matching this structure:
{
  "guild_name": "Descriptive name for this guild",
  "companions": [
    {
      "scientific_name": "Genus species",
      "common_name": "Common Name",
      "layer": "herbaceous",
      "primary_benefit": "nitrogen_fixation",
      "min_distance_feet": 2,
      "max_distance_feet": 8,
      "count": 4,
      "explanation": "Why this works..."
    }
  ],
  "general_notes": "Overall guild strategy and care tips"
}

Focus on permaculture principles: stacking functions, beneficial relationships, native plants when possible, and ecological resilience.`;
}
```

**Step 2: Create suggestion API route**

Create `app/api/guilds/suggest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { buildGuildSuggestionPrompt } from '@/lib/ai/guild-prompter';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.focalSpecies || !body.farmContext) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    const prompt = buildGuildSuggestionPrompt({
      focalSpecies: body.focalSpecies,
      farmContext: body.farmContext,
      constraints: body.constraints
    });

    const completion = await openrouter.chat.completions.create({
      model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      messages: [
        {
          role: 'system',
          content: 'You are a permaculture expert. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content;
    const guildSuggestion = JSON.parse(responseText || '{}');

    return NextResponse.json({
      suggestion: guildSuggestion,
      model: completion.model,
      usage: completion.usage
    });
  } catch (error: any) {
    console.error('Failed to generate guild suggestion:', error);
    return NextResponse.json(
      { error: 'AI suggestion failed', message: error.message },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add lib/ai/guild-prompter.ts app/api/guilds/suggest/route.ts
git commit -m "feat(guilds): add AI guild suggestion API

- Build context-aware prompts for OpenRouter
- Request JSON-formatted guild suggestions
- Include climate, soil, native preferences
- Return companion species with spacing rules

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Guild Designer Component

**Files:**
- Create: `components/guilds/guild-designer.tsx`
- Create: `components/guilds/companion-species-card.tsx`
- Install: `npm install @dnd-kit/core @dnd-kit/sortable`

**Step 1: Create companion species card**

Create `components/guilds/companion-species-card.tsx`:

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';

interface CompanionSpeciesCardProps {
  companion: any;
  onRemove: () => void;
}

export function CompanionSpeciesCard({ companion, onRemove }: CompanionSpeciesCardProps) {
  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />

          <div className="flex-1 min-w-0">
            <div className="font-medium">{companion.common_name}</div>
            <div className="text-sm text-muted-foreground italic">
              {companion.scientific_name}
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{companion.layer}</Badge>
              <Badge variant="outline">{companion.primary_benefit?.replace(/_/g, ' ')}</Badge>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Spacing: {companion.min_distance_feet}-{companion.max_distance_feet} ft |
              Count: {companion.count}
            </div>

            {companion.explanation && (
              <div className="text-sm mt-2 text-muted-foreground">
                {companion.explanation}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create guild designer**

Create `components/guilds/guild-designer.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CompanionSpeciesCard } from './companion-species-card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Save, Loader2 } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface GuildDesignerProps {
  farmId: string;
  focalSpecies: any;
  farmContext: {
    climate_zone: string;
    soil_type?: string;
    rainfall_inches?: number;
  };
}

export function GuildDesigner({ farmId, focalSpecies, farmContext }: GuildDesignerProps) {
  const [companions, setCompanions] = useState<any[]>([]);
  const [guildName, setGuildName] = useState('');
  const [preferNative, setPreferNative] = useState(true);
  const [edibleFocus, setEdibleFocus] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleGetSuggestions() {
    setSuggesting(true);

    try {
      const response = await fetch('/api/guilds/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focalSpecies: {
            scientific_name: focalSpecies.scientific_name,
            common_name: focalSpecies.common_name,
            native_region: focalSpecies.native_region,
            layer: focalSpecies.layer
          },
          farmContext,
          constraints: {
            prefer_native: preferNative,
            edible_focus: edibleFocus,
            max_companions: 6
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();

      setGuildName(data.suggestion.guild_name || `${focalSpecies.common_name} Guild`);
      setCompanions(data.suggestion.companions || []);

      toast({
        title: 'Guild suggested',
        description: `${data.suggestion.companions?.length || 0} companions recommended`
      });
    } catch (error) {
      console.error('Failed to get guild suggestions:', error);
      toast({
        title: 'Suggestion failed',
        variant: 'destructive'
      });
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSaveGuild() {
    if (companions.length === 0) {
      toast({ title: 'Add companions first', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Save as custom guild template
      const response = await fetch('/api/guilds/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guildName,
          focal_species_id: focalSpecies.id,
          companion_species: companions,
          is_public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save guild');
      }

      toast({ title: 'Guild template saved' });
    } catch (error) {
      console.error('Failed to save guild:', error);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveCompanion(index: number) {
    setCompanions(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Guild Designer
        </CardTitle>
        <CardDescription>
          AI-powered companion planting suggestions for {focalSpecies.common_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="guild-name">Guild Name</Label>
          <Input
            id="guild-name"
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            placeholder="e.g., Apple Tree Standard Guild"
          />
        </div>

        <div className="space-y-2 border-b pb-4">
          <Label>Preferences:</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="prefer-native"
              checked={preferNative}
              onCheckedChange={(checked) => setPreferNative(checked as boolean)}
            />
            <Label htmlFor="prefer-native" className="cursor-pointer">
              Prefer native species
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edible-focus"
              checked={edibleFocus}
              onCheckedChange={(checked) => setEdibleFocus(checked as boolean)}
            />
            <Label htmlFor="edible-focus" className="cursor-pointer">
              Focus on edible plants
            </Label>
          </div>
        </div>

        <Button
          onClick={handleGetSuggestions}
          disabled={suggesting}
          className="w-full"
          variant="default"
        >
          {suggesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting AI Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get AI Suggestions
            </>
          )}
        </Button>

        {companions.length > 0 && (
          <>
            <div className="space-y-3">
              <Label>Companion Species:</Label>
              {companions.map((companion, index) => (
                <CompanionSpeciesCard
                  key={index}
                  companion={companion}
                  onRemove={() => handleRemoveCompanion(index)}
                />
              ))}
            </div>

            <Button
              onClick={handleSaveGuild}
              disabled={saving}
              className="w-full"
              variant="outline"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Guild Template
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Install drag-and-drop library**

Run: `npm install @dnd-kit/core @dnd-kit/sortable`

**Step 4: Commit**

```bash
git add components/guilds/guild-designer.tsx components/guilds/companion-species-card.tsx package.json
git commit -m "feat(guilds): add guild designer components

- AI suggestion button with preferences
- Companion species cards with details
- Remove companion functionality
- Save custom guild template
- DnD kit integration (for future reordering)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 2: Offline Mode

### Task 5: Service Worker Setup

**Files:**
- Create: `public/sw.js`
- Create: `lib/offline/register-sw.ts`
- Install: `npm install workbox-webpack-plugin workbox-window`

**Step 1: Create service worker**

Create `public/sw.js`:

```javascript
/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache generated assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache map tiles (long TTL)
registerRoute(
  ({ url }) => url.hostname.includes('tiles.openfreemap.org') ||
               url.hostname.includes('arcgisonline.com'),
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// Cache API responses (short TTL, network first)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ],
    networkTimeoutSeconds: 10
  })
);

// Cache static assets
registerRoute(
  ({ request }) => request.destination === 'style' ||
                   request.destination === 'script' ||
                   request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
```

**Step 2: Create service worker registration**

Create `lib/offline/register-sw.ts`:

```typescript
'use client';

import { Workbox } from 'workbox-window';

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const wb = new Workbox('/sw.js');

  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      console.log('New service worker installed. Refresh to update.');
      // Optionally prompt user to refresh
    } else {
      console.log('Service worker installed for the first time.');
    }
  });

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('Service worker activated for the first time.');
    }
  });

  wb.register();
}
```

**Step 3: Install Workbox**

Run: `npm install workbox-webpack-plugin workbox-window`

**Step 4: Commit**

```bash
git add public/sw.js lib/offline/register-sw.ts package.json
git commit -m "feat(offline): add service worker with Workbox

- Precache static assets
- Cache map tiles with 30-day TTL
- Cache API responses with network-first strategy
- Offline fallback page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: IndexedDB Storage Layer

**Files:**
- Create: `lib/offline/indexed-db.ts`

**Step 1: Create IndexedDB wrapper**

Create `lib/offline/indexed-db.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FarmPlannerDB extends DBSchema {
  farms: {
    key: string;
    value: any;
  };
  zones: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  plantings: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  lines: {
    key: string;
    value: any;
    indexes: { 'by-farm': string };
  };
  offline_queue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      resource: 'zone' | 'planting' | 'line';
      data: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'farm-planner-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FarmPlannerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FarmPlannerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<FarmPlannerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Farms store
      if (!db.objectStoreNames.contains('farms')) {
        db.createObjectStore('farms', { keyPath: 'id' });
      }

      // Zones store
      if (!db.objectStoreNames.contains('zones')) {
        const zonesStore = db.createObjectStore('zones', { keyPath: 'id' });
        zonesStore.createIndex('by-farm', 'farm_id');
      }

      // Plantings store
      if (!db.objectStoreNames.contains('plantings')) {
        const plantingsStore = db.createObjectStore('plantings', { keyPath: 'id' });
        plantingsStore.createIndex('by-farm', 'farm_id');
      }

      // Lines store
      if (!db.objectStoreNames.contains('lines')) {
        const linesStore = db.createObjectStore('lines', { keyPath: 'id' });
        linesStore.createIndex('by-farm', 'farm_id');
      }

      // Offline queue
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    }
  });

  return dbInstance;
}

/**
 * Save farm data to IndexedDB
 */
export async function saveFarmOffline(farm: any) {
  const db = await getDB();
  await db.put('farms', farm);
}

/**
 * Get farm from IndexedDB
 */
export async function getFarmOffline(farmId: string) {
  const db = await getDB();
  return await db.get('farms', farmId);
}

/**
 * Save zones to IndexedDB
 */
export async function saveZonesOffline(farmId: string, zones: any[]) {
  const db = await getDB();
  const tx = db.transaction('zones', 'readwrite');

  await Promise.all(zones.map(zone => tx.store.put(zone)));
  await tx.done;
}

/**
 * Get zones from IndexedDB
 */
export async function getZonesOffline(farmId: string) {
  const db = await getDB();
  return await db.getAllFromIndex('zones', 'by-farm', farmId);
}

/**
 * Save plantings to IndexedDB
 */
export async function savePlantingsOffline(farmId: string, plantings: any[]) {
  const db = await getDB();
  const tx = db.transaction('plantings', 'readwrite');

  await Promise.all(plantings.map(planting => tx.store.put(planting)));
  await tx.done;
}

/**
 * Get plantings from IndexedDB
 */
export async function getPlantingsOffline(farmId: string) {
  const db = await getDB();
  return await db.getAllFromIndex('plantings', 'by-farm', farmId);
}

/**
 * Queue offline change
 */
export async function queueOfflineChange(
  type: 'create' | 'update' | 'delete',
  resource: 'zone' | 'planting' | 'line',
  data: any
) {
  const db = await getDB();
  const changeId = crypto.randomUUID();

  await db.put('offline_queue', {
    id: changeId,
    type,
    resource,
    data,
    timestamp: Date.now()
  });

  return changeId;
}

/**
 * Get all queued offline changes
 */
export async function getOfflineQueue() {
  const db = await getDB();
  return await db.getAll('offline_queue');
}

/**
 * Clear offline queue after sync
 */
export async function clearOfflineQueue() {
  const db = await getDB();
  const tx = db.transaction('offline_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}
```

**Step 2: Install IDB**

Run: `npm install idb`

**Step 3: Commit**

```bash
git add lib/offline/indexed-db.ts package.json
git commit -m "feat(offline): add IndexedDB storage layer

- Farm, zones, plantings, lines stores
- Offline queue for changes
- CRUD operations for offline data
- Index by farm ID for efficient queries

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Offline Sync Manager

**Files:**
- Create: `lib/offline/sync-manager.ts`

**Step 1: Create sync manager**

Create `lib/offline/sync-manager.ts`:

```typescript
import { getOfflineQueue, clearOfflineQueue } from './indexed-db';

export async function syncOfflineChanges() {
  if (!navigator.onLine) {
    console.log('Cannot sync: offline');
    return { success: false, error: 'Device is offline' };
  }

  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    console.log('No offline changes to sync');
    return { success: true, synced: 0 };
  }

  console.log(`Syncing ${queue.length} offline changes...`);

  const errors: any[] = [];

  for (const change of queue) {
    try {
      await syncChange(change);
    } catch (error) {
      console.error('Failed to sync change:', change, error);
      errors.push({ change, error });
    }
  }

  if (errors.length === 0) {
    // All synced successfully
    await clearOfflineQueue();
    console.log('All offline changes synced successfully');
    return { success: true, synced: queue.length };
  } else {
    console.warn(`${errors.length} changes failed to sync`);
    return { success: false, synced: queue.length - errors.length, errors };
  }
}

async function syncChange(change: any) {
  const { type, resource, data } = change;

  let url = '';
  let method = '';

  switch (type) {
    case 'create':
      url = `/api/farms/${data.farm_id}/${resource}s`;
      method = 'POST';
      break;

    case 'update':
      url = `/api/farms/${data.farm_id}/${resource}s/${data.id}`;
      method = 'PATCH';
      break;

    case 'delete':
      url = `/api/farms/${data.farm_id}/${resource}s/${data.id}`;
      method = 'DELETE';
      break;

    default:
      throw new Error(`Unknown change type: ${type}`);
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: type !== 'delete' ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Listen for online/offline events
 */
export function setupOfflineSync() {
  window.addEventListener('online', () => {
    console.log('Device came online. Syncing...');
    syncOfflineChanges();
  });

  window.addEventListener('offline', () => {
    console.log('Device went offline. Changes will be queued.');
  });
}
```

**Step 2: Commit**

```bash
git add lib/offline/sync-manager.ts
git commit -m "feat(offline): add offline sync manager

- Sync queued changes when back online
- Handle create, update, delete operations
- Auto-sync on online event
- Error handling for failed syncs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Offline Indicator Component

**Files:**
- Create: `components/offline/offline-indicator.tsx`

**Step 1: Create offline indicator**

Create `components/offline/offline-indicator.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { syncOfflineChanges } from '@/lib/offline/sync-manager';
import { getOfflineQueue } from '@/lib/offline/indexed-db';
import { useToast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    updateOnlineStatus();
    updateQueueCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateQueueCount, 5000); // Check queue every 5s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  function updateOnlineStatus() {
    setIsOnline(navigator.onLine);
  }

  async function updateQueueCount() {
    const queue = await getOfflineQueue();
    setQueueCount(queue.length);
  }

  function handleOnline() {
    setIsOnline(true);
    toast({ title: 'Back online', description: 'Syncing changes...' });
    handleSync();
  }

  function handleOffline() {
    setIsOnline(false);
    toast({
      title: 'You are offline',
      description: 'Changes will be saved locally',
      variant: 'destructive'
    });
  }

  async function handleSync() {
    setSyncing(true);

    try {
      const result = await syncOfflineChanges();

      if (result.success) {
        toast({
          title: 'Sync complete',
          description: `${result.synced} change${result.synced !== 1 ? 's' : ''} synced`
        });
        updateQueueCount();
      } else {
        toast({
          title: 'Sync failed',
          description: 'Some changes could not be synced',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync error',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  }

  if (isOnline && queueCount === 0) {
    return null; // Hide when online and no pending changes
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}

      {queueCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {queueCount} change{queueCount !== 1 ? 's' : ''} pending
        </Badge>
      )}

      {isOnline && queueCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/offline/offline-indicator.tsx
git commit -m "feat(offline): add offline indicator component

- Show offline badge when disconnected
- Display pending changes count
- Sync now button
- Auto-sync on reconnection

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Integration & Testing

### Task 9: Integrate Guild Builder with Map

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add guild placement on map**

Update `components/map/farm-map.tsx` to place guild companions:

```typescript
import { GuildDesigner } from '@/components/guilds/guild-designer';

// Add guild placement mode
function handlePlaceGuild(guild: any, centerPoint: [number, number]) {
  // Place focal species at center
  const focalPlanting = {
    species_id: guild.focal_species_id,
    location: {
      type: 'Point',
      coordinates: centerPoint
    },
    label: guild.guild_name
  };

  // Place companions around focal species
  guild.companion_species.forEach((companion: any, index: number) => {
    // Calculate position based on spacing rules
    const angle = (index / guild.companion_species.length) * 2 * Math.PI;
    const distance = (companion.min_distance_feet + companion.max_distance_feet) / 2;

    // Convert feet to degrees (approximate)
    const distanceDegrees = distance / 364000;

    const companionPoint: [number, number] = [
      centerPoint[0] + distanceDegrees * Math.cos(angle),
      centerPoint[1] + distanceDegrees * Math.sin(angle)
    ];

    const companionPlanting = {
      species_id: companion.species_id,
      location: {
        type: 'Point',
        coordinates: companionPoint
      },
      label: companion.common_name
    };

    // Create planting via API
    createPlanting(companionPlanting);
  });

  // Create focal planting last
  createPlanting(focalPlanting);
}
```

**Step 2: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(guilds): integrate guild placement on map

- Place guild companions at calculated positions
- Respect spacing rules from template
- Create all plantings via API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Manual Testing Checklist

**Files:**
- Create: `docs/testing/track4-testing-checklist.md`

**Step 1: Create testing checklist**

Create `docs/testing/track4-testing-checklist.md`:

```markdown
# Track 4: Advanced Features - Testing Checklist

## Part 1: Guild Builder

### Guild Template Creation
- [ ] Can view pre-seeded guild templates
- [ ] Templates filtered by climate zone
- [ ] Template details display correctly
- [ ] Can create custom guild template
- [ ] Can edit existing custom template
- [ ] Can delete custom template

### AI Guild Suggestions
- [ ] "Get AI Suggestions" button works
- [ ] Loading indicator shows during AI request
- [ ] AI returns valid guild suggestions
- [ ] Suggested companions display correctly
- [ ] Can adjust preferences (native, edible)
- [ ] Preferences affect AI suggestions
- [ ] Can remove individual companions
- [ ] Can save AI-suggested guild as template

### Guild Designer UI
- [ ] Guild name input editable
- [ ] Focal species displays correctly
- [ ] Companion species cards render
- [ ] Spacing information shown (min-max feet, count)
- [ ] Layer badges display
- [ ] Benefit badges display
- [ ] Explanation text readable
- [ ] Drag-to-reorder works (if implemented)

### Guild Placement on Map
- [ ] Can select guild template
- [ ] Click map to place guild center
- [ ] Focal species placed at center
- [ ] Companions placed at correct distances
- [ ] Companion positions respect spacing rules
- [ ] All plantings created in database
- [ ] Guild plantings visible on map immediately
- [ ] Can assign guild plantings to layer/phase

## Part 2: Offline Mode

### Service Worker
- [ ] Service worker registers successfully
- [ ] Service worker activates
- [ ] Static assets cached
- [ ] Map tiles cached
- [ ] API responses cached
- [ ] Cache updates on new deployment

### IndexedDB Storage
- [ ] Farm data saved to IndexedDB
- [ ] Zones saved to IndexedDB
- [ ] Plantings saved to IndexedDB
- [ ] Lines saved to IndexedDB
- [ ] Data persists across page refreshes
- [ ] Can query data from IndexedDB

### Offline Functionality
- [ ] App loads when offline
- [ ] Can view cached farm data offline
- [ ] Can view map tiles offline
- [ ] Can create zone offline
- [ ] Can create planting offline
- [ ] Can create line offline
- [ ] Can edit features offline
- [ ] Can delete features offline
- [ ] Offline indicator appears when disconnected

### Offline Queue
- [ ] Offline changes queued in IndexedDB
- [ ] Queue count displays correctly
- [ ] Queue persists across page refreshes
- [ ] Can view queued changes (if implemented)

### Sync Manager
- [ ] Auto-sync triggered when back online
- [ ] Manual "Sync Now" button works
- [ ] Queued creates sync correctly
- [ ] Queued updates sync correctly
- [ ] Queued deletes sync correctly
- [ ] Sync success toast appears
- [ ] Queue cleared after successful sync
- [ ] Failed syncs show error message
- [ ] Failed changes remain in queue

### Offline Indicator
- [ ] Offline badge shows when disconnected
- [ ] Pending changes count displays
- [ ] Sync button appears when online with pending changes
- [ ] Indicator hides when online with no pending changes
- [ ] Syncing spinner shows during sync
- [ ] Indicator updates after sync

## Integration Tests

### Guild + Map
- [ ] Guild placement respects farm boundaries
- [ ] Guild companions avoid overlapping existing features
- [ ] Guild plantings filterable by layer
- [ ] Guild plantings assignable to phase
- [ ] Can add annotations to guild plantings

### Offline + All Features
- [ ] Can work with zones offline
- [ ] Can work with plantings offline
- [ ] Can work with lines offline
- [ ] Can work with water features offline
- [ ] Can work with custom imagery offline
- [ ] Comments created offline sync correctly
- [ ] Phase assignments offline sync correctly

## Performance Tests
- [ ] AI guild suggestion completes in <10 seconds
- [ ] Guild placement of 10+ companions smooth
- [ ] IndexedDB operations fast (<100ms)
- [ ] Sync of 50+ changes completes in <30 seconds
- [ ] Service worker cache size reasonable (<50MB)

## Error Handling
- [ ] AI suggestion timeout handled gracefully
- [ ] Invalid guild template shows error
- [ ] Offline queue corruption handled
- [ ] Sync conflict resolution works (if implemented)
- [ ] Network error during sync shows message

## Edge Cases
- [ ] Work offline, go online, sync, go offline, make changes, sync again
- [ ] Multiple tabs open with offline changes
- [ ] Service worker update while offline
- [ ] Large offline queue (100+ changes)
- [ ] Sync while user making new offline changes

## Browser Compatibility
- [ ] Service Worker works in Chrome
- [ ] Service Worker works in Firefox
- [ ] Service Worker works in Safari
- [ ] IndexedDB works in all browsers
- [ ] Offline mode works on mobile browsers

---

**Tester Notes:**

**Environment:**
- URL: http://localhost:3000/farm/[id]
- Test Farm ID: _______________
- Browser: _______________
- Date: _______________

**Issues Found:**
(Record any bugs, unexpected behavior, or UX issues here)
```

**Step 2: Commit**

```bash
git add docs/testing/track4-testing-checklist.md
git commit -m "docs(testing): add Track 4 manual testing checklist

- Guild builder tests
- Offline mode tests
- Sync manager tests
- Integration and edge case tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Complete

This completes the Track 4: Advanced Features implementation plan with 10 detailed tasks covering:

**Part 1: Guild Builder (Tasks 1-4)**
- Guild templates database schema
- Seed sample guild data
- AI guild suggestion API (OpenRouter)
- Guild designer UI components

**Part 2: Offline Mode (Tasks 5-8)**
- Service Worker with Workbox
- IndexedDB storage layer
- Offline sync manager
- Offline indicator component

**Integration & Testing (Tasks 9-10)**
- Guild placement on map
- Manual testing checklist

Total: 10 tasks, each following TDD pattern (test → implementation → commit)

---

## All Four Tracks Complete

**Summary:**
- **Track 1 (23 tasks)**: Annotation System + Design Layer Toggle
- **Track 2 (25 tasks)**: Line/Polyline Drawing + Water Toolkit + Custom Imagery
- **Track 3 (13 tasks)**: Comments + Phasing + Export
- **Track 4 (10 tasks)**: Guild Builder + Offline Mode

**Grand Total: 71 bite-sized implementation tasks**

Each track is independently executable and follows Test-Driven Development principles.
