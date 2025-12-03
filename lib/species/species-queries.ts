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
