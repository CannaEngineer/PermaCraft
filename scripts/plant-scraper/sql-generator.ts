/**
 * SQL Generation Module
 *
 * Converts enriched plant data into SQL INSERT statements compatible
 * with the PermaCraft species table schema. Generates batch SQL files
 * that can be imported via the migration system.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { EnrichedPlant, PlantCategory } from './types';

/**
 * Escape a string for SQL (single quotes)
 */
function sqlEscape(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

/**
 * Format a JSON value for SQL
 */
function sqlJson(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  return `'${sqlEscape(JSON.stringify(value))}'`;
}

/**
 * Format a string value for SQL
 */
function sqlStr(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${sqlEscape(value)}'`;
}

/**
 * Format a number value for SQL
 */
function sqlNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  return String(value);
}

/**
 * Generate a stable, readable ID for a plant
 */
function generateId(plant: EnrichedPlant, category: PlantCategory, index: number): string {
  // Create a readable ID from the category prefix and scientific name
  const prefix = category.substring(0, 3);
  const namePart = plant.scientificName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
  return `${prefix}-${namePart}-${String(index).padStart(3, '0')}`;
}

/**
 * Generate a SQL INSERT statement for a single enriched plant
 */
function generateInsert(plant: EnrichedPlant, id: string): string {
  const e = plant.enrichment;

  return `(${[
    sqlStr(id),
    sqlStr(plant.commonName),
    sqlStr(plant.scientificName),
    sqlStr(e.layer),
    plant.isNative ? '1' : '0',
    sqlNum(e.yearsToMaturity),
    sqlNum(plant.matureHeightFt),
    sqlNum(plant.matureWidthFt),
    sqlStr(plant.sunRequirements),
    sqlStr(plant.waterRequirements),
    sqlStr(e.description),
    sqlJson(e.permacultureFunctions),
    sqlJson(e.companionPlants),
    sqlStr(e.zonePlacementNotes),
    sqlJson(e.edibleParts),
    sqlStr(e.sourcingNotes),
    sqlJson(e.broadRegions),
    sqlStr(plant.minHardinessZone),
    sqlStr(plant.maxHardinessZone),
    sqlNum(plant.minRainfallInches),
    sqlNum(plant.maxRainfallInches),
    '1', // ai_generated = true
  ].join(', ')})`;
}

/**
 * Generate a complete SQL file for a batch of enriched plants.
 * Uses INSERT OR IGNORE to avoid duplicates on re-runs.
 */
export function generateSQL(
  plants: EnrichedPlant[],
  category: PlantCategory,
  categoryLabel: string,
  batchNumber: number,
): string {
  // Sort: high permaculture relevance first, then native first
  const sorted = [...plants].sort((a, b) => {
    const relevanceOrder = { high: 0, medium: 1, low: 2 };
    const relevanceDiff = relevanceOrder[a.enrichment.permacultureRelevance] - relevanceOrder[b.enrichment.permacultureRelevance];
    if (relevanceDiff !== 0) return relevanceDiff;
    if (a.isNative !== b.isNative) return a.isNative ? -1 : 1;
    return a.commonName.localeCompare(b.commonName);
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const highCount = sorted.filter(p => p.enrichment.permacultureRelevance === 'high').length;
  const medCount = sorted.filter(p => p.enrichment.permacultureRelevance === 'medium').length;
  const lowCount = sorted.filter(p => p.enrichment.permacultureRelevance === 'low').length;
  const nativeCount = sorted.filter(p => p.isNative).length;

  let sql = `-- ================================================================================
-- PLANT DATABASE: ${categoryLabel.toUpperCase()}
-- ================================================================================
-- Generated: ${timestamp}
-- Category: ${category}
-- Batch: ${batchNumber}
-- Total Species: ${sorted.length}
-- Native: ${nativeCount} | Non-native: ${sorted.length - nativeCount}
-- Permaculture Relevance: ${highCount} high, ${medCount} medium, ${lowCount} low
-- Source: USDA PLANTS Database + AI Enrichment (flagged as ai_generated)
--
-- IMPORTANT: Plants are sorted by permaculture relevance (high first),
-- then by native status (native first). This ensures the most useful
-- plants for permaculture design appear at the top.
-- ================================================================================

`;

  // Group by relevance for readability
  const groups = [
    { label: 'HIGH PERMACULTURE RELEVANCE', plants: sorted.filter(p => p.enrichment.permacultureRelevance === 'high') },
    { label: 'MEDIUM PERMACULTURE RELEVANCE', plants: sorted.filter(p => p.enrichment.permacultureRelevance === 'medium') },
    { label: 'LOW PERMACULTURE RELEVANCE (Ornamental/Supporting)', plants: sorted.filter(p => p.enrichment.permacultureRelevance === 'low') },
  ];

  let globalIndex = 0;
  for (const group of groups) {
    if (group.plants.length === 0) continue;

    sql += `-- ---------------------------------------------------------------------------
-- ${group.label} (${group.plants.length} species)
-- ---------------------------------------------------------------------------

`;

    // Generate INSERT statements in chunks of 25 for readability
    for (let i = 0; i < group.plants.length; i += 25) {
      const chunk = group.plants.slice(i, i + 25);
      sql += `INSERT OR IGNORE INTO species (id, common_name, scientific_name, layer, is_native, years_to_maturity, mature_height_ft, mature_width_ft, sun_requirements, water_requirements, description, permaculture_functions, companion_plants, zone_placement_notes, edible_parts, sourcing_notes, broad_regions, min_hardiness_zone, max_hardiness_zone, min_rainfall_inches, max_rainfall_inches, ai_generated) VALUES\n`;

      const values = chunk.map((plant, idx) => {
        const id = generateId(plant, category, globalIndex + idx);
        return generateInsert(plant, id);
      });

      sql += values.join(',\n') + ';\n\n';
      globalIndex += chunk.length;
    }
  }

  return sql;
}

/**
 * Write SQL to a file in the data directory
 */
export function writeSQLFile(
  sql: string,
  category: PlantCategory,
  batchNumber: number,
  outputDir: string,
): string {
  const filename = `seed-species-${category}-batch-${batchNumber}.sql`;
  const filePath = path.join(outputDir, filename);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, sql, 'utf-8');

  console.log(`  SQL written to: ${filePath}`);
  return filePath;
}

/**
 * Generate a combined import SQL file that sources all batch files for a category
 */
export function generateImportFile(
  category: PlantCategory,
  categoryLabel: string,
  batchFiles: string[],
  outputDir: string,
): string {
  const timestamp = new Date().toISOString().split('T')[0];

  let sql = `-- ================================================================================
-- IMPORT: ${categoryLabel.toUpperCase()} - All Batches
-- ================================================================================
-- Generated: ${timestamp}
-- Batch files: ${batchFiles.length}
--
-- Run this file to import all ${categoryLabel} species into the database.
-- Each batch uses INSERT OR IGNORE to safely handle re-runs.
-- ================================================================================

`;

  for (const file of batchFiles) {
    const filename = path.basename(file);
    sql += `-- Importing: ${filename}\n`;
    // Read and inline the batch file content
    const content = fs.readFileSync(file, 'utf-8');
    sql += content + '\n';
  }

  const importPath = path.join(outputDir, `seed-species-${category}-all.sql`);
  fs.writeFileSync(importPath, sql, 'utf-8');
  console.log(`  Combined import file: ${importPath}`);
  return importPath;
}

/**
 * Generate a JSON manifest of all scraped data for debugging/review
 */
export function writeManifest(
  plants: EnrichedPlant[],
  category: PlantCategory,
  categoryLabel: string,
  outputDir: string,
): string {
  const manifest = {
    category,
    label: categoryLabel,
    generatedAt: new Date().toISOString(),
    totalSpecies: plants.length,
    nativeCount: plants.filter(p => p.isNative).length,
    byRelevance: {
      high: plants.filter(p => p.enrichment.permacultureRelevance === 'high').length,
      medium: plants.filter(p => p.enrichment.permacultureRelevance === 'medium').length,
      low: plants.filter(p => p.enrichment.permacultureRelevance === 'low').length,
    },
    byLayer: Object.entries(
      plants.reduce((acc, p) => {
        const layer = p.enrichment.layer;
        acc[layer] = (acc[layer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ),
    plants: plants.map(p => ({
      commonName: p.commonName,
      scientificName: p.scientificName,
      native: p.isNative,
      layer: p.enrichment.layer,
      relevance: p.enrichment.permacultureRelevance,
      functions: p.enrichment.permacultureFunctions,
      regions: p.enrichment.broadRegions,
      zones: `${p.minHardinessZone || '?'}-${p.maxHardinessZone || '?'}`,
    })),
  };

  const filePath = path.join(outputDir, `manifest-${category}.json`);
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`  Manifest written to: ${filePath}`);
  return filePath;
}
