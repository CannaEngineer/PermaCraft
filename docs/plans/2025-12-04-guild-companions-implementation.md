# Guild Companions System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement bidirectional companion discovery with fuzzy name matching and layer-based grouping with function badges.

**Architecture:** Add fuzzy matching utilities to species-queries, implement bidirectional companion lookup that combines forward (focal plant's list) and reverse (species listing focal plant) companions, then update species picker UI to group by layer and display function badges.

**Tech Stack:** TypeScript, React, Next.js, Turso (libSQL)

---

## Task 1: Add Fuzzy Matching Utilities

**Files:**
- Modify: `lib/species/species-queries.ts`

**Step 1: Add fuzzy match function**

Add this function after the existing functions:

```typescript
/**
 * Fuzzy match two plant names (case-insensitive, word-order independent)
 */
export function fuzzyMatchPlantName(name1: string, name2: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim();
  const words1 = normalize(name1).split(/\s+/);
  const words2 = normalize(name2).split(/\s+/);

  // Match if all words from either name appear in the other
  return words1.every(w1 => words2.some(w2 => w2.includes(w1))) ||
         words2.every(w2 => words1.some(w1 => w1.includes(w2)));
}
```

**Step 2: Add fuzzy match by names function**

Add this function after fuzzy match:

```typescript
/**
 * Find species by fuzzy matching common names
 */
export function fuzzyMatchSpeciesByNames(
  companionNames: string[],
  allSpecies: Species[]
): Species[] {
  const matched: Species[] = [];

  for (const companionName of companionNames) {
    const found = allSpecies.find(species =>
      fuzzyMatchPlantName(species.common_name, companionName)
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

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit fuzzy matching utilities**

```bash
git add lib/species/species-queries.ts
git commit -m "feat: add fuzzy matching utilities for plant names"
```

---

## Task 2: Implement Bidirectional Companion Discovery

**Files:**
- Modify: `lib/species/species-queries.ts`

**Step 1: Add getGuildCompanions function**

Add this function after the fuzzy matching utilities:

```typescript
/**
 * Get guild companions for a species (bidirectional)
 * Combines:
 * 1. Forward: Species listed in focal plant's companion_plants
 * 2. Reverse: Species that list focal plant in their companion_plants
 */
export function getGuildCompanions(
  focalPlantCommonName: string,
  focalPlantCompanionsList: string | null,
  allSpecies: Species[]
): Species[] {
  // Step 1: Forward companions (focal plant's list)
  let forwardCompanions: Species[] = [];
  if (focalPlantCompanionsList) {
    try {
      const companionNames: string[] = JSON.parse(focalPlantCompanionsList);
      forwardCompanions = fuzzyMatchSpeciesByNames(companionNames, allSpecies);
    } catch (error) {
      console.error('Failed to parse focal plant companion_plants:', error);
    }
  }

  // Step 2: Reverse companions (species listing focal plant)
  const reverseCompanions = allSpecies.filter(species => {
    if (!species.companion_plants) return false;
    try {
      const companions: string[] = JSON.parse(species.companion_plants);
      return companions.some(companion =>
        fuzzyMatchPlantName(companion, focalPlantCommonName)
      );
    } catch {
      return false;
    }
  });

  // Step 3: Combine and deduplicate by species ID
  const combined = [...forwardCompanions, ...reverseCompanions];
  const uniqueMap = new Map(combined.map(s => [s.id, s]));

  return Array.from(uniqueMap.values());
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit bidirectional discovery**

```bash
git add lib/species/species-queries.ts
git commit -m "feat: add bidirectional guild companion discovery"
```

---

## Task 3: Add Layer Grouping Utility

**Files:**
- Modify: `lib/species/species-queries.ts`

**Step 1: Add layer order constant**

Add this constant at the top of the file after imports:

```typescript
export const LAYER_ORDER = [
  'canopy',
  'understory',
  'shrub',
  'herbaceous',
  'groundcover',
  'vine',
  'root',
  'aquatic'
] as const;
```

**Step 2: Add grouping function**

Add this function after getGuildCompanions:

```typescript
/**
 * Group species by layer in display order
 */
export function groupSpeciesByLayer(species: Species[]): Record<string, Species[]> {
  const grouped: Record<string, Species[]> = {};

  for (const layer of LAYER_ORDER) {
    grouped[layer] = species
      .filter(s => s.layer === layer)
      .sort((a, b) => a.common_name.localeCompare(b.common_name));
  }

  return grouped;
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit layer grouping**

```bash
git add lib/species/species-queries.ts
git commit -m "feat: add layer-based species grouping utility"
```

---

## Task 4: Update Species Picker - Import New Utilities

**Files:**
- Modify: `components/map/species-picker-panel.tsx:1-20`

**Step 1: Add imports for new utilities**

Update the imports section to include:

```typescript
import { getGuildCompanions, groupSpeciesByLayer, LAYER_ORDER } from '@/lib/species/species-queries';
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit import updates**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: import guild companion utilities in species picker"
```

---

## Task 5: Update Species Picker - Replace Filtering Logic

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (getFilteredSpecies function)

**Step 1: Replace companion filtering logic**

Find the `getFilteredSpecies` function (around line 36) and replace the companion filtering section:

```typescript
// OLD CODE (lines 56-71):
// Filter by companion plants if requested
if (companionFilterFor) {
  species = species.filter(s => {
    if (!s.companion_plants) return false;
    try {
      const companions: string[] = JSON.parse(s.companion_plants);
      // Check if this species lists the focal plant as a companion
      return companions.some(companion =>
        companion.toLowerCase() === companionFilterFor.toLowerCase()
      );
    } catch (error) {
      console.error('Failed to parse companion_plants:', error);
      return false;
    }
  });
}

// NEW CODE:
// Filter by companion plants if requested (bidirectional)
if (companionFilterFor) {
  // Find the focal plant species to get its companion list
  const focalPlantSpecies = species.find(s =>
    s.common_name.toLowerCase() === companionFilterFor.toLowerCase()
  );

  species = getGuildCompanions(
    companionFilterFor,
    focalPlantSpecies?.companion_plants || null,
    species
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit filtering logic update**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: use bidirectional companion discovery in species picker"
```

---

## Task 6: Add Layer Grouping State

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (component body)

**Step 1: Add grouped species state**

After the `getFilteredSpecies` function (around line 82), add:

```typescript
const filteredSpecies = getFilteredSpecies();

// Group by layer when showing companions
const groupedByLayer = companionFilterFor
  ? groupSpeciesByLayer(filteredSpecies)
  : null;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit state addition**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: add layer grouping state for companion view"
```

---

## Task 7: Add Function Badge Styles

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (top of file)

**Step 1: Add badge style constants**

After the imports, add these constants:

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
  pest_deterrent: 'Pest Control',
  wildlife_habitat: 'Wildlife',
};
```

**Step 2: Import Badge component**

Add to imports:

```typescript
import { Badge } from '@/components/ui/badge';
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit badge styles**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: add function badge styles for companions"
```

---

## Task 8: Create FunctionBadges Component

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (after constants)

**Step 1: Add FunctionBadges helper component**

Add this component after the badge constants:

```typescript
function FunctionBadges({ permacultureFunctions }: { permacultureFunctions: string | null }) {
  if (!permacultureFunctions) return null;

  try {
    const functions: string[] = JSON.parse(permacultureFunctions);
    // Show max 3 badges
    const displayFunctions = functions.slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {displayFunctions.map((func: string) => (
          <Badge
            key={func}
            variant="outline"
            className={`text-xs px-2 py-0.5 ${FUNCTION_BADGE_STYLES[func] || 'bg-gray-100 text-gray-800'}`}
          >
            {FUNCTION_LABELS[func] || func.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit function badges component**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: add FunctionBadges component for displaying permaculture functions"
```

---

## Task 9: Update Species Card Rendering

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (species card section)

**Step 1: Add function badges to species cards**

Find the species card rendering section (around line 130-160) and add function badges after the layer badge:

```typescript
{/* Existing layer badge */}
<Badge variant="secondary" className="text-xs capitalize">
  {s.layer}
</Badge>

{/* NEW: Function badges for companions */}
{companionFilterFor && <FunctionBadges permacultureFunctions={s.permaculture_functions} />}
```

The exact location should be inside the species card, after the layer badge display.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit function badge integration**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: display function badges on companion species cards"
```

---

## Task 10: Implement Layer-Grouped View

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (species list rendering)

**Step 1: Replace flat species list with grouped view**

Find the species list rendering section and replace with conditional rendering:

```typescript
{/* Species List */}
<div className="flex-1 overflow-y-auto p-4">
  {companionFilterFor && groupedByLayer ? (
    /* Layer-grouped view for companions */
    <>
      {LAYER_ORDER.map(layer => {
        const layerSpecies = groupedByLayer[layer];
        if (layerSpecies.length === 0) return null;

        return (
          <div key={layer} className="mb-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 capitalize">
              {layer} Layer ({layerSpecies.length})
            </h3>
            <div className="space-y-2">
              {layerSpecies.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSpecies(s)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {s.common_name}
                      </div>
                      <div className="text-xs text-muted-foreground italic truncate">
                        {s.scientific_name}
                      </div>
                      {s.is_native === 1 && (
                        <Badge variant="default" className="mt-1 text-xs bg-green-600">
                          Native
                        </Badge>
                      )}
                      <FunctionBadges permacultureFunctions={s.permaculture_functions} />
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">
                      {s.layer}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  ) : (
    /* Existing flat list view */
    filteredSpecies.map(s => (
      // Keep existing species card rendering
      <button key={s.id} /* ... existing code ... */ />
    ))
  )}
</div>
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test visually**

Run: `npm run dev`
Expected: Dev server starts successfully

**Step 4: Commit grouped view**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: implement layer-grouped view for guild companions"
```

---

## Task 11: Add Empty State for No Companions

**Files:**
- Modify: `components/map/species-picker-panel.tsx` (species list section)

**Step 1: Add empty state check**

After the opening of the species list div, add:

```typescript
{/* Empty state for no companions */}
{companionFilterFor && filteredSpecies.length === 0 && (
  <div className="text-center py-12 space-y-4">
    <div className="text-muted-foreground">
      No guild companions found for <span className="font-semibold">{companionFilterFor}</span>
    </div>
    <p className="text-sm text-muted-foreground">
      This plant may work well on its own, or companion data needs to be added.
    </p>
    <Button
      onClick={onClose}
      variant="outline"
      size="sm"
    >
      Browse All Plants
    </Button>
  </div>
)}
```

**Step 2: Import Button if not already imported**

Check imports and add if needed:

```typescript
import { Button } from '@/components/ui/button';
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit empty state**

```bash
git add components/map/species-picker-panel.tsx
git commit -m "feat: add empty state for guild companions with no results"
```

---

## Task 12: Manual Testing

**Files:**
- Test: Running application

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Test bidirectional discovery**

1. Navigate to a farm with plantings
2. Plant "White Oak" on the map
3. Click the planted White Oak marker
4. Click "Show Guild Companions" button
5. Verify species picker shows:
   - Serviceberry (forward companion)
   - American Hazelnut (forward companion)
   - Any species with White Oak in their companion_plants (reverse)

**Step 3: Test fuzzy matching**

1. Check database for companion names with different cases
2. Verify all companions are found regardless of case/formatting

**Step 4: Test layer grouping**

1. In companion view, verify species are grouped by layer
2. Verify layers appear in order: canopy, understory, shrub, etc.
3. Verify empty layers are hidden

**Step 5: Test function badges**

1. Verify function badges appear for companions
2. Check that badges show correct colors
3. Verify max 3 badges per species

**Step 6: Test empty state**

1. Find a species with no companions (or temporarily edit one)
2. Click "Show Guild Companions"
3. Verify empty state message appears
4. Verify "Browse All Plants" button works

**Step 7: Document any issues**

Create issues for any bugs found.

---

## Task 13: Final Build Verification

**Files:**
- All modified files

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Check for console warnings**

1. Open dev tools
2. Navigate through companion workflow
3. Check console for warnings
Expected: No unexpected warnings

**Step 4: Final commit if cleanup needed**

```bash
git add .
git commit -m "chore: final cleanup for guild companions"
```

**Step 5: Push to remote**

```bash
git push origin main
```

Expected: All commits pushed successfully

---

## Completion Checklist

- [ ] Fuzzy matching utilities added
- [ ] Bidirectional companion discovery implemented
- [ ] Layer grouping utility added
- [ ] Species picker imports updated
- [ ] Companion filtering uses bidirectional lookup
- [ ] Layer grouping state added
- [ ] Function badge styles defined
- [ ] FunctionBadges component created
- [ ] Function badges display on cards
- [ ] Layer-grouped view implemented
- [ ] Empty state added
- [ ] Manual testing completed
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Changes pushed to remote

---

## Notes for Engineer

**Key Implementation Details:**

1. **Fuzzy Matching**: Uses word-based matching so "White Oak" matches "oak white", "white oak", etc. Normalizes to lowercase and splits on whitespace.

2. **Bidirectional Discovery**: Combines two queries:
   - Forward: Parse focal plant's companion_plants JSON
   - Reverse: Find all species with focal plant in their companion_plants
   - Deduplicate by species ID using Map

3. **Layer Grouping**: Uses LAYER_ORDER constant to ensure consistent display order from canopy to aquatic. Filters out empty layers for cleaner UI.

4. **Function Badges**: Limited to 3 badges per species to avoid UI clutter. Priority given to most important permaculture functions (nitrogen_fixer, pollinator_attractor, etc.).

5. **Conditional Rendering**: Flat list for normal browsing, layer-grouped view only when companionFilterFor is set.

**Common Pitfalls:**

- Don't forget to parse JSON for companion_plants and permaculture_functions
- Handle null/undefined gracefully with try-catch
- Deduplicate by ID, not by object reference
- Empty layers should be completely hidden, not shown with "(0)"
- Function badges should only show in companion view, not normal browsing

**Testing Focus:**

- Test with species that have bidirectional relationships
- Test fuzzy matching with various case/word order combinations
- Verify layer grouping shows correct order
- Check that function badges display correctly
- Test empty state when no companions found
