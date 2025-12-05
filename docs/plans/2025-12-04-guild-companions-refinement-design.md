# Guild Companions System Refinement Design

**Date**: 2025-12-04
**Status**: Approved for Implementation

## Overview

Refine the guild companions system to provide bidirectional companion discovery with fuzzy name matching and contextual grouping by layer and permaculture functions. This enables users to build complete plant guilds by showing both explicitly listed companions and species that list the focal plant as their companion.

## Problem Statement

Current issues with the companion system:

1. **Reverse-only lookup**: System only shows species that list the focal plant as their companion, ignoring the focal plant's own companion list
2. **No fuzzy matching**: Exact name matches fail due to case/formatting variations ("White Oak" vs "white oak")
3. **No contextual grouping**: Companions shown as flat list without layer structure or functional context
4. **Incomplete relationships**: Missing bidirectional relationships means incomplete guild recommendations

## Solution

Implement a refined guild companions system with:

1. **Bidirectional Discovery**: Show both forward companions (focal plant's list) and reverse companions (species listing focal plant)
2. **Fuzzy Name Matching**: Handle case variations and word order differences
3. **Layer-Based Grouping**: Organize companions by structural layer (canopy → groundcover)
4. **Function Badges**: Display permaculture functions inline for each companion
5. **Smart Deduplication**: Combine forward and reverse results without duplicates

## Architecture

### User Flow

```
1. User clicks planted species (e.g., White Oak) on map
   ↓
2. Clicks "Show Guild Companions" button in planting detail popup
   ↓
3. Species picker opens with companionFilterFor = "White Oak"
   ↓
4. System performs bidirectional companion lookup:
   - Forward: Get White Oak's companion_plants → ["Serviceberry", "American Hazelnut"]
   - Reverse: Find species with "White Oak" in their companion_plants
   ↓
5. Fuzzy match common names to species objects
   ↓
6. Group by layer (canopy, understory, shrub, etc.)
   ↓
7. Display grouped companions with function badges
   ↓
8. User selects companion to plant nearby
```

### Component Architecture

**Modified Components:**

1. `lib/species/species-queries.ts`
   - Add: `getGuildCompanions(commonName: string, allSpecies: Species[]): Species[]`
   - Performs bidirectional lookup with fuzzy matching

2. `components/map/species-picker-panel.tsx`
   - Enhance: Replace flat filtering with layer-grouped display
   - Add: Function badge rendering for each companion
   - Update: Use new `getGuildCompanions` logic

3. Unchanged but mentioned for context:
   - `components/map/planting-detail-popup.tsx` (triggers companion mode)
   - `components/map/farm-map.tsx` (manages companion filter state)

## Detailed Design

### 1. Bidirectional Companion Discovery

**Function Signature:**
```typescript
function getGuildCompanions(
  focalPlantCommonName: string,
  focalPlantCompanionsList: string[] | null, // Parsed JSON from species.companion_plants
  allSpecies: Species[]
): Species[]
```

**Logic:**
```typescript
// Step 1: Forward companions (focal plant's list)
const forwardCompanions = focalPlantCompanionsList
  ? fuzzyMatchSpeciesByNames(focalPlantCompanionsList, allSpecies)
  : [];

// Step 2: Reverse companions (species listing focal plant)
const reverseCompanions = allSpecies.filter(species => {
  if (!species.companion_plants) return false;
  try {
    const companions: string[] = JSON.parse(species.companion_plants);
    return companions.some(companion =>
      fuzzyMatch(companion, focalPlantCommonName)
    );
  } catch {
    return false;
  }
});

// Step 3: Combine and deduplicate
const combined = [...forwardCompanions, ...reverseCompanions];
const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());

return unique;
```

**Example:**
- White Oak's companion_plants: `["Serviceberry", "American Hazelnut"]`
- Elderberry's companion_plants: `["White Oak", "Goldenrod"]`
- Result for White Oak: Serviceberry, American Hazelnut, Elderberry

### 2. Fuzzy Name Matching

**Algorithm:**
```typescript
function fuzzyMatch(name1: string, name2: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim();
  const words1 = normalize(name1).split(/\s+/);
  const words2 = normalize(name2).split(/\s+/);

  // Match if all words from either name appear in the other
  return words1.every(w1 => words2.some(w2 => w2.includes(w1))) ||
         words2.every(w2 => words1.some(w1 => w1.includes(w2)));
}

function fuzzyMatchSpeciesByNames(
  companionNames: string[],
  allSpecies: Species[]
): Species[] {
  const matched: Species[] = [];

  for (const companionName of companionNames) {
    const found = allSpecies.find(species =>
      fuzzyMatch(species.common_name, companionName)
    );

    if (found) {
      matched.push(found);
    } else {
      console.warn(`Could not find species for companion: "${companionName}"`);
    }
  }

  return matched;
}
```

**Test Cases:**
| Input | Match | Result |
|-------|-------|--------|
| "White Oak" | "White Oak" | ✓ Match |
| "white oak" | "White Oak" | ✓ Match |
| "Oak White" | "White Oak" | ✓ Match |
| "  White  Oak  " | "White Oak" | ✓ Match |
| "American Hazelnut" | "american hazelnut" | ✓ Match |
| "Hazelnut" | "American Hazelnut" | ✓ Partial match |
| "Oak" | "White Oak" | ✓ Partial match |
| "Pine" | "White Oak" | ✗ No match |

### 3. Layer-Based Grouping

**Layer Order:**
```typescript
const LAYER_ORDER = [
  'canopy',      // Trees 40ft+
  'understory',  // Small trees 15-40ft
  'shrub',       // Woody 3-15ft
  'herbaceous',  // Perennials/annuals
  'groundcover', // Low spreaders
  'vine',        // Climbers
  'root',        // Root crops
  'aquatic'      // Water plants
] as const;
```

**Grouping Logic:**
```typescript
function groupCompanionsByLayer(companions: Species[]): Record<string, Species[]> {
  const grouped: Record<string, Species[]> = {};

  for (const layer of LAYER_ORDER) {
    grouped[layer] = companions
      .filter(c => c.layer === layer)
      .sort((a, b) => a.common_name.localeCompare(b.common_name));
  }

  return grouped;
}
```

**UI Rendering:**
```tsx
{LAYER_ORDER.map(layer => {
  const layerCompanions = groupedCompanions[layer];
  if (layerCompanions.length === 0) return null; // Hide empty layers

  return (
    <div key={layer}>
      <h3 className="font-semibold capitalize mb-2">
        {layer} Layer ({layerCompanions.length})
      </h3>
      <div className="space-y-2">
        {layerCompanions.map(species => (
          <SpeciesCard
            key={species.id}
            species={species}
            showFunctionBadges={true}
          />
        ))}
      </div>
    </div>
  );
})}
```

### 4. Function Badges

**Badge Mapping:**
```typescript
const FUNCTION_BADGE_STYLES: Record<string, string> = {
  nitrogen_fixer: 'bg-blue-100 text-blue-800 border-blue-300',
  pollinator_attractor: 'bg-purple-100 text-purple-800 border-purple-300',
  dynamic_accumulator: 'bg-green-100 text-green-800 border-green-300',
  pest_deterrent: 'bg-red-100 text-red-800 border-red-300',
  wildlife_habitat: 'bg-amber-100 text-amber-800 border-amber-300',
};

const FUNCTION_LABELS: Record<string, string> = {
  nitrogen_fixer: 'N-Fixer',
  pollinator_attractor: 'Pollinator',
  dynamic_accumulator: 'Accumulator',
  pest_deterrent: 'Pest Deterrent',
  wildlife_habitat: 'Wildlife',
};
```

**Rendering:**
```tsx
{species.permaculture_functions && (
  <div className="flex flex-wrap gap-1 mt-1">
    {JSON.parse(species.permaculture_functions).map((func: string) => (
      <Badge
        key={func}
        variant="outline"
        className={cn("text-xs px-2 py-0", FUNCTION_BADGE_STYLES[func])}
      >
        {FUNCTION_LABELS[func] || func.replace(/_/g, ' ')}
      </Badge>
    ))}
  </div>
)}
```

**Badge Priority (show first 3 max):**
1. Nitrogen Fixer (most valuable for guild)
2. Pollinator Attractor (essential for food forest)
3. Dynamic Accumulator (nutrient cycling)
4. Others as space allows

### 5. Empty State Handling

**No Companions Found:**
```tsx
{filteredCompanions.length === 0 && (
  <div className="text-center py-12 space-y-4">
    <div className="text-muted-foreground">
      No guild companions found for <span className="font-semibold">{companionFilterFor}</span>
    </div>
    <p className="text-sm text-muted-foreground">
      This plant may work well on its own, or companion data needs to be added.
    </p>
    <Button onClick={() => onClearCompanionFilter()}>
      Browse All Plants
    </Button>
  </div>
)}
```

**Unmatched Companion Names:**
```typescript
// Log but don't fail
if (!matchedSpecies) {
  console.warn(
    `Guild companion lookup: Could not find species for "${companionName}" ` +
    `(focal plant: ${focalPlantCommonName})`
  );
}
```

## Error Handling

**Graceful Degradation:**

1. **Invalid JSON in companion_plants:**
   ```typescript
   try {
     const companions = JSON.parse(species.companion_plants);
   } catch (error) {
     console.error('Invalid companion_plants JSON:', error);
     return []; // Treat as no companions
   }
   ```

2. **Null/undefined companion_plants:**
   ```typescript
   if (!species.companion_plants) return [];
   ```

3. **Fuzzy match failures:**
   - Log unmatched names
   - Continue with other companions
   - Show partial results

4. **Empty results:**
   - Show helpful message
   - Offer "Browse All Plants" escape hatch

## Performance Considerations

**Optimization Strategies:**

1. **Client-side filtering**: All species already loaded, no additional DB queries
2. **Single pass per direction**: Forward lookup = 1 pass, Reverse lookup = 1 pass
3. **Deduplication via Map**: O(n) deduplication using species.id as key
4. **Limit results**: Cap at 50 companions (unlikely to hit in practice)
5. **Lazy render layers**: Only render non-empty layer groups

**Expected Performance:**
- Species list: ~160 species in memory
- Companion lookup: <10ms for bidirectional search
- Fuzzy matching: <1ms per comparison
- Total: <20ms for complete guild discovery

## Database Schema

**No schema changes required**. Current schema already supports this:

```sql
CREATE TABLE species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  layer TEXT NOT NULL,
  companion_plants TEXT, -- JSON array of common names
  permaculture_functions TEXT, -- JSON array
  -- ... other fields
);
```

**Data format examples:**
```json
// White Oak
{
  "companion_plants": ["Serviceberry", "American Hazelnut"],
  "permaculture_functions": ["wildlife_habitat", "edible"]
}

// Serviceberry
{
  "companion_plants": ["White Oak", "Eastern Redbud"],
  "permaculture_functions": ["pollinator_attractor", "edible"]
}
```

## Testing Strategy

**Manual Test Cases:**

1. **Bidirectional Discovery:**
   - Plant White Oak, click "Show Guild Companions"
   - Verify shows: Serviceberry, American Hazelnut (forward)
   - Verify shows: Elderberry (if Elderberry lists White Oak)

2. **Fuzzy Matching:**
   - Test case variations: "White Oak", "white oak", "Oak White"
   - All should match "White Oak" species

3. **Layer Grouping:**
   - Verify companions grouped by layer
   - Verify layers sorted canopy → aquatic
   - Verify empty layers hidden

4. **Function Badges:**
   - Verify badges show for species with permaculture_functions
   - Verify badge colors match function types
   - Verify max 3 badges per species

5. **Edge Cases:**
   - Species with no companions → Show "Browse All Plants"
   - Invalid JSON → Graceful fallback
   - Companion name not found → Log warning, continue

## Implementation Files

**Files to Modify:**

1. `lib/species/species-queries.ts`
   - Add fuzzy matching utilities
   - Add bidirectional companion discovery

2. `components/map/species-picker-panel.tsx`
   - Replace flat filtering with grouped display
   - Add function badge rendering
   - Update companion filter logic

**Files to Reference (no changes):**
- `lib/db/schema.ts` (Species type definition)
- `components/map/planting-detail-popup.tsx` (triggers companion mode)
- `components/map/farm-map.tsx` (manages state)

## Success Metrics

**User Experience:**
- Guild companions load instantly (<50ms perceived delay)
- All valid companion relationships discovered (forward + reverse)
- Clear visual grouping by layer
- Function badges provide planting context

**Technical Quality:**
- Zero database queries for companion lookup (client-side)
- <2% companion name match failures (fuzzy matching effectiveness)
- No console errors in production
- Graceful degradation for all edge cases

## Future Enhancements (Out of Scope)

1. **AI-suggested companions**: Use LLM to suggest additional companions based on ecosystem
2. **Spatial proximity hints**: "Plant Serviceberry within 15ft of White Oak"
3. **Seasonal planting order**: "Plant Hazelnut first (Year 1), then Oak (Year 3)"
4. **Companion intensity**: Show how strongly plants benefit each other (1-5 stars)
5. **Guild templates**: Pre-configured guilds ("Three Sisters", "Oak Guild", "Berry Guild")

## Migration Notes

**No database migration required**. This is a pure frontend/logic enhancement using existing data.

**Backward compatibility**: Existing companion_plants data works as-is. No changes to data structure.

## Rollout Plan

1. Implement fuzzy matching utilities
2. Implement bidirectional discovery logic
3. Update species picker with layer grouping
4. Add function badge rendering
5. Test with real data in development
6. Deploy to production

No feature flags needed (non-breaking enhancement).
