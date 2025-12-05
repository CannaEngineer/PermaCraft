import { db } from '@/lib/db';
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
  return result.rows as unknown as Species[];
}

/**
 * Get species by ID
 */
export async function getSpeciesById(id: string): Promise<Species | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM species WHERE id = ?',
    args: [id]
  });

  return (result.rows[0] as unknown as Species) || null;
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

  return result.rows as unknown as Species[];
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

  return result.rows as unknown as Species[];
}

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
