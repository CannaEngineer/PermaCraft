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
