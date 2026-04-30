// lib/varieties/variety-queries.ts
import { db } from '@/lib/db';
import type { PlantVariety, PlantVarietyWithSpecies } from '@/lib/db/schema';

/**
 * Get varieties for a species. Top-level by default — set `parentVarietyId`
 * to fetch sub-varieties of a specific variety, or null to be explicit about
 * fetching only top-level (parent_variety_id IS NULL) entries.
 *
 * When `farmId`/`userId` are provided, custom (user-contributed) varieties
 * scoped to that user/farm are included alongside the global catalog.
 */
export async function getVarietiesBySpecies(
  speciesId: string,
  options?: {
    parentVarietyId?: string | null;
    userId?: string;
    farmId?: string;
  }
): Promise<PlantVarietyWithSpecies[]> {
  const args: (string | number)[] = [speciesId];
  let sql = `SELECT
              v.*,
              s.common_name as species_common_name,
              s.scientific_name as species_scientific_name,
              s.layer as species_layer
            FROM plant_varieties v
            JOIN species s ON v.species_id = s.id
            WHERE v.species_id = ?`;

  if (options && 'parentVarietyId' in options) {
    if (options.parentVarietyId === null || options.parentVarietyId === undefined) {
      sql += ' AND v.parent_variety_id IS NULL';
    } else {
      sql += ' AND v.parent_variety_id = ?';
      args.push(options.parentVarietyId);
    }
  } else {
    // Default: top-level varieties only — sub-varieties are fetched on demand
    // when the user drills into a specific variety.
    sql += ' AND v.parent_variety_id IS NULL';
  }

  if (options?.userId || options?.farmId) {
    const conds: string[] = ['v.is_custom = 0'];
    if (options.userId) {
      conds.push('v.created_by = ?');
      args.push(options.userId);
    }
    if (options.farmId) {
      conds.push('v.farm_id = ?');
      args.push(options.farmId);
    }
    sql += ` AND (${conds.join(' OR ')})`;
  } else {
    sql += ' AND v.is_custom = 0';
  }

  sql += ' ORDER BY v.expert_rating DESC, v.variety_name ASC';

  const result = await db.execute({ sql, args });
  return result.rows as unknown as PlantVarietyWithSpecies[];
}

/**
 * Insert a new (typically user-created) variety. Set `parent_variety_id` to
 * nest a sub-variety underneath an existing variety — that handles the
 * "varieties within varieties" case (e.g., Chestnut → Colossal → user's own
 * sub-selection).
 */
export async function createVariety(input: {
  speciesId: string;
  varietyName: string;
  parentVarietyId?: string | null;
  varietyType?: PlantVariety['variety_type'];
  description?: string | null;
  notes?: string | null;
  isCustom?: boolean;
  createdByUserId?: string | null;
  farmId?: string | null;
}): Promise<PlantVariety> {
  const id = crypto.randomUUID();
  const trimmedName = input.varietyName.trim();
  if (!trimmedName) {
    throw new Error('varietyName is required');
  }

  await db.execute({
    sql: `INSERT INTO plant_varieties
          (id, species_id, variety_name, variety_type, description,
           parent_variety_id, is_custom, created_by, farm_id, popularity_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    args: [
      id,
      input.speciesId,
      trimmedName,
      input.varietyType || 'cultivar',
      input.description || input.notes || null,
      input.parentVarietyId || null,
      input.isCustom ? 1 : 0,
      input.createdByUserId || null,
      input.farmId || null,
    ],
  });

  const result = await db.execute({
    sql: 'SELECT * FROM plant_varieties WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as PlantVariety;
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
