#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db/index.js';

interface EliteVariety {
  species_common: string;
  variety_name: string;
  variety_type: 'cultivar' | 'hybrid' | 'heirloom' | 'wild_selection';
  breeding_program?: string;
  introduction_year?: number;
  description: string;
  flavor_notes?: string;
  elite_characteristics?: Record<string, any>;
  awards?: Array<{ name: string; year: number; organization: string }>;
  hardiness_zone_min?: string;
  hardiness_zone_max?: string;
  chill_hours_required?: number;
  days_to_maturity?: number;
  yield_rating?: 'low' | 'medium' | 'high' | 'exceptional';
  sourcing_notes?: string;
  availability?: 'common' | 'specialty' | 'rare';
  average_price_usd?: number;
  expert_rating?: number;
}

const ELITE_VARIETIES: EliteVariety[] = [
  // Apple varieties
  {
    species_common: 'Apple',
    variety_name: 'Honeycrisp',
    variety_type: 'cultivar',
    breeding_program: 'University of Minnesota',
    introduction_year: 1991,
    description: 'Explosively crisp texture with balanced sweet-tart flavor. Excellent storage life and cold hardiness.',
    flavor_notes: 'Sweet-tart, honey notes, exceptionally juicy',
    elite_characteristics: {
      disease_resistance: ['scab_moderate'],
      storage_life: 'excellent',
      texture: 'exceptionally_crisp',
      cold_hardy: true
    },
    awards: [
      { name: 'Best Apple Variety', year: 2004, organization: 'American Pomological Society' }
    ],
    hardiness_zone_min: '3',
    hardiness_zone_max: '8',
    chill_hours_required: 800,
    yield_rating: 'high',
    sourcing_notes: 'Widely available at nurseries. Try Stark Bros, Raintree Nursery, local garden centers.',
    availability: 'common',
    average_price_usd: 35,
    expert_rating: 9
  },
  {
    species_common: 'Apple',
    variety_name: 'Liberty',
    variety_type: 'cultivar',
    breeding_program: 'Cornell University',
    introduction_year: 1978,
    description: 'Disease-resistant variety with excellent flavor. Dark red skin with crisp, juicy flesh.',
    flavor_notes: 'Sweet-tart, crisp, aromatic',
    elite_characteristics: {
      disease_resistance: ['scab', 'cedar_apple_rust', 'fire_blight'],
      storage_life: 'good',
      organic_friendly: true
    },
    hardiness_zone_min: '4',
    hardiness_zone_max: '8',
    chill_hours_required: 700,
    yield_rating: 'high',
    sourcing_notes: 'Available at most nurseries. Popular for organic orchards.',
    availability: 'common',
    average_price_usd: 30,
    expert_rating: 8
  },
  {
    species_common: 'Apple',
    variety_name: 'Enterprise',
    variety_type: 'cultivar',
    breeding_program: 'Purdue University',
    introduction_year: 1994,
    description: 'Highly disease-resistant with exceptional keeping quality. Crisp, firm flesh with balanced flavor.',
    flavor_notes: 'Sweet-tart, improves with storage',
    elite_characteristics: {
      disease_resistance: ['scab', 'cedar_apple_rust', 'fire_blight', 'mildew'],
      storage_life: 'exceptional',
      late_harvest: true
    },
    hardiness_zone_min: '5',
    hardiness_zone_max: '8',
    chill_hours_required: 800,
    yield_rating: 'high',
    sourcing_notes: 'Available from specialty nurseries. Cummins Nursery, Fedco Trees.',
    availability: 'specialty',
    average_price_usd: 35,
    expert_rating: 9
  },

  // Tomato varieties
  {
    species_common: 'Tomato',
    variety_name: 'Cherokee Purple',
    variety_type: 'heirloom',
    introduction_year: 1990,
    description: 'Legendary heirloom with dusky purple-brown color and rich, complex flavor.',
    flavor_notes: 'Sweet, smoky, rich umami notes',
    elite_characteristics: {
      flavor_profile: 'exceptional',
      heat_tolerant: true,
      crack_resistant: 'moderate'
    },
    awards: [
      { name: 'Heirloom Garden Show Winner', year: 1995, organization: 'Seed Savers Exchange' }
    ],
    hardiness_zone_min: '3',
    hardiness_zone_max: '11',
    days_to_maturity: 80,
    yield_rating: 'high',
    sourcing_notes: 'Seeds widely available. Baker Creek, Seed Savers Exchange, Johnny\'s.',
    availability: 'common',
    average_price_usd: 4,
    expert_rating: 9
  },
  {
    species_common: 'Tomato',
    variety_name: 'Sun Gold',
    variety_type: 'hybrid',
    breeding_program: 'Tokita Seed Company',
    description: 'Incredibly sweet cherry tomato with golden-orange color. Vigorous and productive.',
    flavor_notes: 'Sweet, fruity, tropical notes',
    elite_characteristics: {
      flavor_profile: 'exceptional',
      productivity: 'very_high',
      crack_resistant: 'good'
    },
    awards: [
      { name: 'All-America Selections Winner', year: 1992, organization: 'AAS' }
    ],
    hardiness_zone_min: '3',
    hardiness_zone_max: '11',
    days_to_maturity: 57,
    yield_rating: 'exceptional',
    sourcing_notes: 'Widely available. Johnny\'s, Burpee, local garden centers.',
    availability: 'common',
    average_price_usd: 5,
    expert_rating: 10
  },

  // Blueberry varieties
  {
    species_common: 'Blueberry',
    variety_name: 'Duke',
    variety_type: 'cultivar',
    breeding_program: 'USDA',
    introduction_year: 1987,
    description: 'Early-season northern highbush with large, firm berries. Excellent winter hardiness.',
    flavor_notes: 'Sweet, mild, classic blueberry flavor',
    elite_characteristics: {
      winter_hardiness: 'excellent',
      early_season: true,
      firm_berries: true,
      disease_resistance: ['mummy_berry']
    },
    hardiness_zone_min: '4',
    hardiness_zone_max: '7',
    chill_hours_required: 800,
    yield_rating: 'high',
    sourcing_notes: 'Available at most nurseries. Stark Bros, Raintree.',
    availability: 'common',
    average_price_usd: 25,
    expert_rating: 8
  },
  {
    species_common: 'Blueberry',
    variety_name: 'Chandler',
    variety_type: 'cultivar',
    breeding_program: 'USDA',
    introduction_year: 1994,
    description: 'Largest blueberry variety with exceptional flavor. Extended harvest season.',
    flavor_notes: 'Sweet, complex, aromatic',
    elite_characteristics: {
      berry_size: 'extra_large',
      extended_harvest: true,
      flavor_profile: 'exceptional'
    },
    hardiness_zone_min: '5',
    hardiness_zone_max: '8',
    chill_hours_required: 800,
    yield_rating: 'high',
    sourcing_notes: 'Specialty nurseries. Fall Creek Nursery, Raintree.',
    availability: 'specialty',
    average_price_usd: 30,
    expert_rating: 9
  },

  // Kale varieties
  {
    species_common: 'Kale',
    variety_name: 'Lacinato',
    variety_type: 'heirloom',
    description: 'Italian heirloom also known as Dinosaur Kale. Dark blue-green leaves with tender texture.',
    flavor_notes: 'Sweet, earthy, less bitter than curly kale',
    elite_characteristics: {
      cold_hardy: true,
      texture: 'tender',
      bolt_resistant: true
    },
    hardiness_zone_min: '2',
    hardiness_zone_max: '11',
    days_to_maturity: 60,
    yield_rating: 'high',
    sourcing_notes: 'Seeds widely available. Johnny\'s, High Mowing, Territorial.',
    availability: 'common',
    average_price_usd: 3,
    expert_rating: 8
  },

  // Strawberry varieties
  {
    species_common: 'Strawberry',
    variety_name: 'Seascape',
    variety_type: 'cultivar',
    breeding_program: 'University of California',
    introduction_year: 1992,
    description: 'Day-neutral variety with excellent flavor and continuous production. Heat tolerant.',
    flavor_notes: 'Sweet, aromatic, well-balanced',
    elite_characteristics: {
      day_neutral: true,
      heat_tolerant: true,
      disease_resistance: ['verticillium_wilt'],
      continuous_production: true
    },
    hardiness_zone_min: '4',
    hardiness_zone_max: '9',
    yield_rating: 'exceptional',
    sourcing_notes: 'Nourse Farms, Indiana Berry, local nurseries.',
    availability: 'common',
    average_price_usd: 15,
    expert_rating: 9
  }
];

async function seedVarieties() {
  console.log('🌱 Seeding elite varieties...\n');

  let seededCount = 0;
  let skippedCount = 0;

  for (const variety of ELITE_VARIETIES) {
    try {
      // Get species ID
      const speciesResult = await db.execute({
        sql: 'SELECT id FROM species WHERE common_name = ? LIMIT 1',
        args: [variety.species_common]
      });

      if (speciesResult.rows.length === 0) {
        console.log(`⚠️  Species not found: ${variety.species_common} (skipping ${variety.variety_name})`);
        skippedCount++;
        continue;
      }

      const speciesId = speciesResult.rows[0].id;

      // Check if variety already exists
      const existingResult = await db.execute({
        sql: 'SELECT id FROM plant_varieties WHERE species_id = ? AND variety_name = ?',
        args: [speciesId, variety.variety_name]
      });

      if (existingResult.rows.length > 0) {
        console.log(`⏭️  Already exists: ${variety.variety_name} (${variety.species_common})`);
        skippedCount++;
        continue;
      }

      // Insert variety
      await db.execute({
        sql: `INSERT INTO plant_varieties
              (id, species_id, variety_name, variety_type, breeding_program,
               introduction_year, description, flavor_notes, elite_characteristics,
               awards, hardiness_zone_min, hardiness_zone_max, chill_hours_required,
               days_to_maturity, yield_rating, sourcing_notes, availability,
               average_price_usd, expert_rating)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          speciesId,
          variety.variety_name,
          variety.variety_type,
          variety.breeding_program || null,
          variety.introduction_year || null,
          variety.description,
          variety.flavor_notes || null,
          variety.elite_characteristics ? JSON.stringify(variety.elite_characteristics) : null,
          variety.awards ? JSON.stringify(variety.awards) : null,
          variety.hardiness_zone_min || null,
          variety.hardiness_zone_max || null,
          variety.chill_hours_required || null,
          variety.days_to_maturity || null,
          variety.yield_rating || null,
          variety.sourcing_notes || null,
          variety.availability || null,
          variety.average_price_usd || null,
          variety.expert_rating || null
        ]
      });

      console.log(`✅ Seeded: ${variety.variety_name} (${variety.species_common})`);
      seededCount++;
    } catch (error) {
      console.error(`❌ Error seeding ${variety.variety_name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Seeded: ${seededCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   📦 Total: ${ELITE_VARIETIES.length}`);
  console.log('\n✨ Done!');

  await db.close();
}

seedVarieties().then(() => process.exit(0)).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
