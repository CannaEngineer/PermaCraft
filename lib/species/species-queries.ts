import { db } from '@/lib/db';
import type { Species } from '@/lib/db/schema';

// Re-export client-safe utilities
export {
  LAYER_ORDER,
  fuzzyMatchPlantName,
  fuzzyMatchSpeciesByNames,
  getGuildCompanions,
  groupSpeciesByLayer
} from './species-utils';

/**
 * Get all species with optional filters.
 *
 * Supports filtering by:
 * - native status
 * - layer (canopy, shrub, etc.)
 * - text search (common/scientific name)
 * - hardiness zone (returns species whose zone range includes the given zone)
 * - region (matches broad_regions JSON array)
 * - permaculture-only (species with permaculture_functions defined)
 *
 * Results are sorted to prioritize:
 * 1. Native species first
 * 2. Species with permaculture functions first
 * 3. Alphabetically by common name
 */
export async function getAllSpecies(filters?: {
  native?: boolean;
  layer?: string;
  search?: string;
  hardinessZone?: string;
  region?: string;
  permacultureOnly?: boolean;
}): Promise<Species[]> {
  let sql = 'SELECT * FROM species WHERE 1=1';
  const args: (string | number)[] = [];

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

  // Filter by hardiness zone: species whose min-max range includes the given zone
  if (filters?.hardinessZone) {
    const zone = parseInt(filters.hardinessZone, 10);
    if (!isNaN(zone)) {
      sql += ' AND (min_hardiness_zone IS NULL OR CAST(min_hardiness_zone AS INTEGER) <= ?)';
      sql += ' AND (max_hardiness_zone IS NULL OR CAST(max_hardiness_zone AS INTEGER) >= ?)';
      args.push(zone, zone);
    }
  }

  // Filter by region: check if broad_regions JSON array contains the region
  if (filters?.region) {
    sql += ' AND broad_regions LIKE ?';
    args.push(`%"${filters.region}"%`);
  }

  // Filter to only species with permaculture functions defined
  if (filters?.permacultureOnly) {
    sql += ' AND permaculture_functions IS NOT NULL AND permaculture_functions != \'[]\' AND permaculture_functions != \'null\'';
  }

  // Sort: native first, then species with permaculture functions, then alphabetically
  sql += ` ORDER BY
    is_native DESC,
    CASE WHEN permaculture_functions IS NOT NULL AND permaculture_functions != '[]' AND permaculture_functions != 'null' THEN 0 ELSE 1 END,
    common_name ASC`;

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
          ORDER BY
            is_native DESC,
            CASE WHEN permaculture_functions IS NOT NULL AND permaculture_functions != '[]' THEN 0 ELSE 1 END,
            common_name ASC
          LIMIT ?`,
    args: [searchParam, searchParam, limit]
  });

  return result.rows as unknown as Species[];
}
