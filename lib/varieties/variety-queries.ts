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
