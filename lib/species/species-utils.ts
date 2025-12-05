import type { Species } from '@/lib/db/schema';

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
