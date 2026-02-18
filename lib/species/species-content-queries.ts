import { db } from '@/lib/db';
import type { SpeciesContent } from '@/lib/db/schema';

/**
 * Get species content by species ID
 */
export async function getSpeciesContent(speciesId: string): Promise<SpeciesContent | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM species_content WHERE species_id = ?',
    args: [speciesId],
  });
  return (result.rows[0] as unknown as SpeciesContent) || null;
}

/**
 * Upsert species content (insert or update)
 */
export async function upsertSpeciesContent(
  speciesId: string,
  data: {
    narrative_summary?: string | null;
    narrative_full?: string | null;
    growing_guide?: string | null;
    growing_guide_summary?: string | null;
    ai_model_used?: string | null;
  }
): Promise<void> {
  const existing = await getSpeciesContent(speciesId);

  if (existing) {
    const fields: string[] = [];
    const args: any[] = [];

    if (data.narrative_summary !== undefined) {
      fields.push('narrative_summary = ?');
      args.push(data.narrative_summary);
    }
    if (data.narrative_full !== undefined) {
      fields.push('narrative_full = ?');
      args.push(data.narrative_full);
    }
    if (data.growing_guide !== undefined) {
      fields.push('growing_guide = ?');
      args.push(data.growing_guide);
    }
    if (data.growing_guide_summary !== undefined) {
      fields.push('growing_guide_summary = ?');
      args.push(data.growing_guide_summary);
    }
    if (data.ai_model_used !== undefined) {
      fields.push('ai_model_used = ?');
      args.push(data.ai_model_used);
    }

    fields.push('generated_at = unixepoch()');
    fields.push('updated_at = unixepoch()');

    await db.execute({
      sql: `UPDATE species_content SET ${fields.join(', ')} WHERE species_id = ?`,
      args: [...args, speciesId],
    });
  } else {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO species_content
              (id, species_id, narrative_summary, narrative_full, growing_guide,
               growing_guide_summary, ai_model_used, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        id,
        speciesId,
        data.narrative_summary ?? null,
        data.narrative_full ?? null,
        data.growing_guide ?? null,
        data.growing_guide_summary ?? null,
        data.ai_model_used ?? null,
      ],
    });
  }
}

/**
 * Get species that don't have content yet (for batch generation)
 */
export async function getSpeciesWithoutContent(limit: number = 10): Promise<{ id: string; common_name: string; scientific_name: string }[]> {
  const result = await db.execute({
    sql: `SELECT s.id, s.common_name, s.scientific_name
          FROM species s
          LEFT JOIN species_content sc ON sc.species_id = s.id
          WHERE sc.id IS NULL
          ORDER BY s.common_name ASC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as { id: string; common_name: string; scientific_name: string }[];
}
