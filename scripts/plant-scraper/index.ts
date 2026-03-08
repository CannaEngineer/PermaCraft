#!/usr/bin/env tsx
/**
 * Plant Database Scraper - Main Orchestrator
 *
 * Comprehensive plant database builder for PermaCraft that:
 * 1. Fetches plant data from the USDA PLANTS Database (plants.usda.gov)
 * 2. Falls back to curated species lists from authoritative sources
 * 3. Enriches all data with permaculture-specific information using AI
 * 4. Generates SQL files ready for import into the species table
 *
 * Usage:
 *   # List all available categories (sorted by permaculture priority)
 *   npx tsx scripts/plant-scraper/index.ts --list
 *
 *   # Scrape a specific category
 *   npx tsx scripts/plant-scraper/index.ts --category nitrogen_fixers
 *
 *   # Scrape multiple categories
 *   npx tsx scripts/plant-scraper/index.ts --category nitrogen_fixers,fruit_nut_trees,berry_bushes
 *
 *   # Scrape all categories in priority order
 *   npx tsx scripts/plant-scraper/index.ts --all
 *
 *   # Skip AI enrichment (just generate from curated lists with minimal data)
 *   npx tsx scripts/plant-scraper/index.ts --category nitrogen_fixers --skip-enrichment
 *
 *   # Use a specific AI model for enrichment
 *   npx tsx scripts/plant-scraper/index.ts --category nitrogen_fixers --model google/gemini-2.0-flash-001
 *
 *   # Dry run - show what would be scraped without doing it
 *   npx tsx scripts/plant-scraper/index.ts --all --dry-run
 *
 * Environment Variables:
 *   OPENROUTER_API_KEY - Required for AI enrichment (skip with --skip-enrichment)
 *
 * Output:
 *   data/scraped/seed-species-{category}-batch-{n}.sql - SQL insert files
 *   data/scraped/manifest-{category}.json - JSON manifest for review
 */

import * as path from 'path';
import { PLANT_CATEGORIES, getCategoriesByPriority, getCategory, listCategories } from './categories';
import { scrapeCategory } from './usda-scraper';
import { enrichPlants } from './enrichment';
import { generateSQL, writeSQLFile, writeManifest } from './sql-generator';
import { getCuratedPlants } from './curated-plants';
import type { PlantCategory, ScrapedPlant, EnrichedPlant } from './types';

const OUTPUT_DIR = path.resolve(__dirname, '../../data/scraped');

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIArgs {
  list: boolean;
  categories: PlantCategory[];
  all: boolean;
  skipEnrichment: boolean;
  skipUSDA: boolean;
  model?: string;
  dryRun: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    list: false,
    categories: [],
    all: false,
    skipEnrichment: false,
    skipUSDA: false,
    model: undefined,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--list':
      case '-l':
        result.list = true;
        break;
      case '--category':
      case '-c':
        if (args[i + 1]) {
          result.categories = args[i + 1].split(',') as PlantCategory[];
          i++;
        }
        break;
      case '--all':
      case '-a':
        result.all = true;
        break;
      case '--skip-enrichment':
        result.skipEnrichment = true;
        break;
      case '--skip-usda':
        result.skipUSDA = true;
        break;
      case '--model':
      case '-m':
        if (args[i + 1]) {
          result.model = args[i + 1];
          i++;
        }
        break;
      case '--dry-run':
      case '-d':
        result.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
Plant Database Scraper for PermaCraft
=====================================

Builds a comprehensive plant database from USDA PLANTS data + AI enrichment.

Usage:
  npx tsx scripts/plant-scraper/index.ts [options]

Options:
  --list, -l              List all available plant categories
  --category, -c <name>   Scrape specific category (comma-separated for multiple)
  --all, -a               Scrape all categories in priority order
  --skip-enrichment       Skip AI enrichment (basic data only)
  --skip-usda             Skip USDA API, use curated lists only (faster)
  --model, -m <model>     AI model for enrichment (default: llama-3.2-90b)
  --dry-run, -d           Show what would be done without doing it
  --help, -h              Show this help message

Examples:
  npx tsx scripts/plant-scraper/index.ts --list
  npx tsx scripts/plant-scraper/index.ts --category nitrogen_fixers
  npx tsx scripts/plant-scraper/index.ts --category fruit_nut_trees,berry_bushes --skip-usda
  npx tsx scripts/plant-scraper/index.ts --all --dry-run

Environment:
  OPENROUTER_API_KEY      Required for AI enrichment
  `);
}

// ============================================================================
// Main Processing
// ============================================================================

async function processCategory(
  category: PlantCategory,
  options: { skipEnrichment: boolean; skipUSDA: boolean; model?: string; dryRun: boolean },
): Promise<void> {
  const catDef = getCategory(category);
  if (!catDef) {
    console.error(`Unknown category: ${category}`);
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  CATEGORY: ${catDef.label}`);
  console.log(`  Priority: ${catDef.permaculturePriority} | Est. species: ${catDef.estimatedCount}`);
  console.log(`  ${catDef.description}`);
  console.log(`${'='.repeat(70)}`);

  if (options.dryRun) {
    const curated = getCuratedPlants(category);
    console.log(`\n  [DRY RUN] Would process ${curated.length} curated + USDA API species`);
    console.log(`  [DRY RUN] Would generate SQL in: ${OUTPUT_DIR}`);
    return;
  }

  // Step 1: Get raw plant data
  let plants: ScrapedPlant[] = [];

  // First try curated lists (reliable, comprehensive)
  const curated = getCuratedPlants(category);
  if (curated.length > 0) {
    console.log(`\n  Using curated list: ${curated.length} species`);
    plants = curated;
  }

  // Optionally augment with USDA API data
  if (!options.skipUSDA) {
    try {
      const usdaPlants = await scrapeCategory(catDef);
      // Merge USDA results, avoiding duplicates by scientific name
      const existing = new Set(plants.map(p => p.scientificName.toLowerCase()));
      const newPlants = usdaPlants.filter(p => !existing.has(p.scientificName.toLowerCase()));
      if (newPlants.length > 0) {
        console.log(`  Added ${newPlants.length} additional species from USDA API`);
        plants = [...plants, ...newPlants];
      }
    } catch (err) {
      console.warn(`  USDA API unavailable, using curated list only: ${(err as Error).message}`);
    }
  }

  if (plants.length === 0) {
    console.warn(`  No plants found for category ${category}. Skipping.`);
    return;
  }

  console.log(`\n  Total plants to process: ${plants.length}`);

  // Step 2: Enrich with permaculture data
  let enriched: EnrichedPlant[];
  if (options.skipEnrichment) {
    console.log('  Skipping AI enrichment (--skip-enrichment)');
    enriched = plants.map(plant => ({
      ...plant,
      enrichment: {
        layer: catDef.defaultLayer,
        permacultureFunctions: [],
        companionPlants: [],
        zonePlacementNotes: '',
        edibleParts: null,
        sourcingNotes: '',
        description: `${plant.commonName} (${plant.scientificName})`,
        broadRegions: [],
        yearsToMaturity: null,
        permacultureRelevance: 'medium' as const,
      },
    }));
  } else {
    enriched = await enrichPlants(plants, catDef, { model: options.model });
  }

  // Step 3: Generate SQL
  const sql = generateSQL(enriched, category, catDef.label, 1);
  const sqlFile = writeSQLFile(sql, category, 1, OUTPUT_DIR);

  // Step 4: Write manifest
  writeManifest(enriched, category, catDef.label, OUTPUT_DIR);

  // Summary
  const nativeCount = enriched.filter(p => p.isNative).length;
  const highCount = enriched.filter(p => p.enrichment.permacultureRelevance === 'high').length;

  console.log(`\n  Summary for ${catDef.label}:`);
  console.log(`  - Total species: ${enriched.length}`);
  console.log(`  - Native: ${nativeCount} (${Math.round(nativeCount / enriched.length * 100)}%)`);
  console.log(`  - High permaculture relevance: ${highCount}`);
  console.log(`  - SQL file: ${sqlFile}`);
}

// ============================================================================
// Import Script Generator
// ============================================================================

function generateImportScript(categories: PlantCategory[]): void {
  const importScript = `#!/usr/bin/env tsx
/**
 * Auto-generated import script for scraped plant data.
 * Run this to import all scraped species into the database.
 *
 * Usage:
 *   npx tsx scripts/plant-scraper/import-scraped.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@libsql/client';

const SCRAPED_DIR = path.resolve(__dirname, '../../data/scraped');

async function main() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const sqlFiles = fs.readdirSync(SCRAPED_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Found SQL files to import:', sqlFiles.length);

  for (const file of sqlFiles) {
    console.log('\\nImporting:', file);
    const sql = fs.readFileSync(path.join(SCRAPED_DIR, file), 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let imported = 0;
    for (const stmt of statements) {
      try {
        await db.execute(stmt + ';');
        imported++;
      } catch (err) {
        // INSERT OR IGNORE will skip duplicates silently
        console.warn('  Statement failed:', (err as Error).message.substring(0, 100));
      }
    }
    console.log('  Executed', imported, 'statements');
  }

  // Report totals
  const result = await db.execute('SELECT COUNT(*) as count FROM species');
  console.log('\\nTotal species in database:', result.rows[0]?.count);

  const aiResult = await db.execute('SELECT COUNT(*) as count FROM species WHERE ai_generated = 1');
  console.log('AI-generated species:', aiResult.rows[0]?.count);
}

main().catch(console.error);
`;

  const importPath = path.join(path.resolve(__dirname), 'import-scraped.ts');
  require('fs').writeFileSync(importPath, importScript, 'utf-8');
  console.log(`\nImport script generated: ${importPath}`);
}

// ============================================================================
// Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          PermaCraft Plant Database Scraper              ║');
  console.log('║   USDA PLANTS + AI Permaculture Enrichment Pipeline    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // List mode
  if (args.list) {
    console.log('\nAvailable Plant Categories (sorted by permaculture priority):');
    console.log('─'.repeat(70));
    const cats = listCategories();
    let totalEstimated = 0;
    for (const cat of cats) {
      const marker = cat.priority <= 2 ? '★' : cat.priority <= 3 ? '●' : '○';
      const curated = getCuratedPlants(cat.category as PlantCategory);
      const curatedInfo = curated.length > 0 ? ` (${curated.length} curated)` : '';
      console.log(`  ${marker} P${cat.priority}  ${cat.category.padEnd(25)} ${cat.label.padEnd(40)} ~${cat.estimated} spp${curatedInfo}`);
      totalEstimated += cat.estimated;
    }
    console.log('─'.repeat(70));
    console.log(`  Total estimated species: ~${totalEstimated}`);
    console.log('\n  ★ = Core permaculture  ● = Important  ○ = Complementary');
    console.log('\n  Use: --category <name> to scrape a specific category');
    console.log('  Use: --all to scrape everything (takes a while)');
    return;
  }

  // Determine which categories to process
  let categoriesToProcess: PlantCategory[] = [];

  if (args.all) {
    categoriesToProcess = getCategoriesByPriority().map(c => c.category);
  } else if (args.categories.length > 0) {
    categoriesToProcess = args.categories;
  } else {
    console.log('\nNo category specified. Use --list to see options or --help for usage.');
    return;
  }

  // Validate categories
  for (const cat of categoriesToProcess) {
    if (!getCategory(cat)) {
      console.error(`Unknown category: ${cat}`);
      console.error('Use --list to see available categories.');
      process.exit(1);
    }
  }

  // Check for API key if enrichment is enabled
  if (!args.skipEnrichment && !args.dryRun && !process.env.OPENROUTER_API_KEY) {
    console.error('\nOPENROUTER_API_KEY not set.');
    console.error('Set it in .env.local or export it, or use --skip-enrichment to skip AI.');
    process.exit(1);
  }

  console.log(`\nProcessing ${categoriesToProcess.length} categories...`);
  if (args.dryRun) console.log('[DRY RUN MODE - no files will be created]');
  if (args.skipEnrichment) console.log('[AI enrichment disabled]');
  if (args.skipUSDA) console.log('[USDA API disabled - using curated lists only]');

  // Process each category
  let totalPlants = 0;
  for (const category of categoriesToProcess) {
    await processCategory(category, {
      skipEnrichment: args.skipEnrichment,
      skipUSDA: args.skipUSDA,
      model: args.model,
      dryRun: args.dryRun,
    });
    const curated = getCuratedPlants(category);
    totalPlants += curated.length;
  }

  if (!args.dryRun) {
    // Generate import script
    generateImportScript(categoriesToProcess);

    console.log('\n' + '='.repeat(70));
    console.log('  SCRAPING COMPLETE');
    console.log('='.repeat(70));
    console.log(`  Categories processed: ${categoriesToProcess.length}`);
    console.log(`  Output directory: ${OUTPUT_DIR}`);
    console.log(`\n  Next steps:`);
    console.log(`  1. Review the generated SQL files in data/scraped/`);
    console.log(`  2. Review the JSON manifests to verify data quality`);
    console.log(`  3. Import into database:`);
    console.log(`     npx tsx scripts/plant-scraper/import-scraped.ts`);
    console.log(`  4. Or apply individual SQL files via migration system`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
