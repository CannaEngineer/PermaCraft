import { db } from '@/lib/db';
import { sampleGuildTemplates } from '@/data/seed-guilds';

async function seedGuildTemplates() {
  console.log('Seeding guild templates...');

  // Get species IDs from names
  const allSpecies = await db.execute({
    sql: 'SELECT id, scientific_name, common_name FROM species'
  });

  const speciesMap = new Map();
  allSpecies.rows.forEach(row => {
    const key = row.common_name || row.scientific_name;
    speciesMap.set(key, row.id);
  });

  for (const template of sampleGuildTemplates) {
    // Find focal species ID
    const focalSpeciesId = speciesMap.get(template.focal_species_name);
    if (!focalSpeciesId) {
      console.warn(`Focal species not found: ${template.focal_species_name}`);
      continue;
    }

    // Map companion species names to IDs
    const companionSpecies = template.companion_species.map(comp => {
      const speciesId = speciesMap.get(comp.species_name);
      if (!speciesId) {
        console.warn(`Companion species not found: ${comp.species_name}`);
        return null;
      }

      return {
        species_id: speciesId,
        layer: comp.layer,
        min_distance_feet: comp.min_distance_feet,
        max_distance_feet: comp.max_distance_feet,
        count: comp.count,
        cardinal_direction: comp.cardinal_direction
      };
    }).filter(Boolean);

    // Insert guild template
    await db.execute({
      sql: `INSERT INTO guild_templates
            (id, name, description, climate_zones, focal_species_id, companion_species, spacing_rules, benefits, is_public, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        template.id,
        template.name,
        template.description,
        JSON.stringify(template.climate_zones),
        focalSpeciesId,
        JSON.stringify(companionSpecies),
        JSON.stringify(template.spacing_rules),
        JSON.stringify(template.benefits),
        1,
        'system'
      ]
    });

    console.log(`✓ Seeded: ${template.name}`);
  }

  console.log('Guild template seeding complete!');
}

seedGuildTemplates();
