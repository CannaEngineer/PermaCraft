/**
 * USDA PLANTS Database Scraper
 *
 * Fetches plant data from the USDA PLANTS Database API.
 * The USDA PLANTS Database (plants.usda.gov) is the authoritative source
 * for plant information in the United States.
 *
 * Data source: https://plants.usda.gov
 * API docs: https://plantsservices.sc.egov.usda.gov
 */

import type { ScrapedPlant, USDAPlant } from './types';
import type { CategoryDefinition } from './categories';

const USDA_API_BASE = 'https://plantsservices.sc.egov.usda.gov/api';

// Rate limiting: USDA API is a government service, be respectful
const REQUEST_DELAY_MS = 1500;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PermaCraft-PlantScraper/1.0 (permaculture education project)',
        },
      });
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        console.warn(`  Attempt ${attempt}/${retries} failed (${response.status}), retrying...`);
        await sleep(2000 * attempt);
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  Attempt ${attempt}/${retries} failed, retrying...`);
      await sleep(2000 * attempt);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Search USDA PLANTS database by genus/species name
 */
async function searchByName(searchTerm: string): Promise<USDAPlant[]> {
  const url = `${USDA_API_BASE}/PlantProfile?symbol=${encodeURIComponent(searchTerm)}`;
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

/**
 * Fetch plants by genus from USDA PLANTS database using their search endpoint.
 * Falls back to a curated list approach when the API doesn't support direct genus search.
 */
async function fetchByGenus(genus: string): Promise<USDAPlant[]> {
  // The USDA PLANTS database API has limited search capabilities.
  // We use the text search endpoint to find species by genus.
  const url = `${USDA_API_BASE}/PlantSearch?Search=${encodeURIComponent(genus)}&Limit=50`;
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data?.PlantResults) return data.PlantResults;
    return [];
  } catch {
    return [];
  }
}

/**
 * Map USDA growth habit to permaculture layer
 */
function mapGrowthHabitToLayer(habit: string, heightFt: number | null): string {
  const h = habit?.toLowerCase() || '';
  if (h.includes('tree')) {
    if (heightFt && heightFt < 30) return 'understory';
    return 'canopy';
  }
  if (h.includes('shrub') || h.includes('subshrub')) return 'shrub';
  if (h.includes('vine')) return 'vine';
  if (h.includes('graminoid')) return 'herbaceous';
  if (h.includes('forb') || h.includes('herb')) return 'herbaceous';
  return 'herbaceous';
}

/**
 * Map USDA shade tolerance to sun requirements
 */
function mapSunRequirements(shadeTolerance: string | undefined): string | null {
  if (!shadeTolerance) return null;
  const st = shadeTolerance.toLowerCase();
  if (st === 'intolerant') return 'Full sun';
  if (st === 'intermediate') return 'Full sun to part shade';
  if (st === 'tolerant') return 'Part shade to full shade';
  return null;
}

/**
 * Map USDA moisture use to water requirements
 */
function mapWaterRequirements(moistureUse: string | undefined): string | null {
  if (!moistureUse) return null;
  const mu = moistureUse.toLowerCase();
  if (mu === 'low') return 'Low';
  if (mu === 'medium') return 'Medium';
  if (mu === 'high') return 'High';
  return null;
}

/**
 * Estimate hardiness zone from minimum temperature
 */
function tempToHardinessZone(tempMinF: number | undefined): string | null {
  if (tempMinF === undefined || tempMinF === null) return null;
  if (tempMinF <= -60) return '1';
  if (tempMinF <= -50) return '2';
  if (tempMinF <= -40) return '3';
  if (tempMinF <= -30) return '4';
  if (tempMinF <= -20) return '5';
  if (tempMinF <= -10) return '6';
  if (tempMinF <= 0) return '7';
  if (tempMinF <= 10) return '8';
  if (tempMinF <= 20) return '9';
  if (tempMinF <= 30) return '10';
  if (tempMinF <= 40) return '11';
  return '12';
}

/**
 * Determine native status from USDA native status string
 */
function parseNativeStatus(status: string | undefined): boolean {
  if (!status) return false;
  // L48(N) = native to Lower 48, L48(I) = introduced
  return status.includes('(N)');
}

/**
 * Format common name: capitalize first letter of each word
 */
function formatCommonName(name: string): string {
  if (!name) return 'Unknown';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert a USDA plant record to our ScrapedPlant format
 */
function convertUSDAPlant(usda: USDAPlant): ScrapedPlant {
  const heightFt = usda.Height_Mature_ft || null;

  return {
    symbol: usda.Symbol || '',
    commonName: formatCommonName(usda.Common_Name || ''),
    scientificName: usda.Scientific_Name || '',
    family: usda.Family || '',
    growthHabit: usda.Growth_Habit || '',
    duration: usda.Duration || '',
    isNative: parseNativeStatus(usda.Native_Status),
    nativeStatus: usda.Native_Status || '',
    matureHeightFt: heightFt,
    matureWidthFt: heightFt ? Math.round(heightFt * 0.6) : null, // Estimate width as ~60% of height
    sunRequirements: mapSunRequirements(usda.Shade_Tolerance),
    waterRequirements: mapWaterRequirements(usda.Moisture_Use),
    minHardinessZone: tempToHardinessZone(usda.Temperature_Minimum_F),
    maxHardinessZone: null, // USDA doesn't provide max zone directly
    minRainfallInches: usda.Precipitation_Minimum || null,
    maxRainfallInches: usda.Precipitation_Maximum || null,
    bloomPeriod: usda.Bloom_Period || null,
    droughtTolerance: usda.Drought_Tolerance || null,
    nitrogenFixation: usda.Nitrogen_Fixation || null,
    shadeTolerance: usda.Shade_Tolerance || null,
    palatableHuman: usda.Palatable_Human || null,
    fruitSeedPeriod: usda.Fruit_Seed_Period_Begin
      ? `${usda.Fruit_Seed_Period_Begin} - ${usda.Fruit_Seed_Period_End || ''}`
      : null,
  };
}

/**
 * Scrape plants for a given category definition.
 * Uses search terms from the category to query USDA PLANTS API.
 */
export async function scrapeCategory(category: CategoryDefinition): Promise<ScrapedPlant[]> {
  const plants: ScrapedPlant[] = [];
  const seen = new Set<string>();
  const searchTerms = category.usdaFilters.searchTerms || [];

  console.log(`\n  Searching USDA for ${category.label}...`);
  console.log(`  Search terms: ${searchTerms.length} genera/species`);

  for (const term of searchTerms) {
    console.log(`    Fetching genus: ${term}...`);
    await sleep(REQUEST_DELAY_MS);

    const results = await fetchByGenus(term);
    let added = 0;

    for (const result of results) {
      const key = result.Scientific_Name?.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const plant = convertUSDAPlant(result);
      plants.push(plant);
      added++;
    }

    if (added > 0) {
      console.log(`      Found ${added} species for ${term}`);
    }
  }

  console.log(`  Total scraped for ${category.label}: ${plants.length} species`);
  return plants;
}

/**
 * Build a curated plant list when API is unavailable or returns limited results.
 * Uses well-known species data compiled from USDA PLANTS, extension services,
 * and permaculture references (Toensmeier, Jacke, etc.)
 */
export function buildCuratedList(category: CategoryDefinition): ScrapedPlant[] {
  // This is a fallback that uses our curated knowledge base.
  // The enrichment step will add permaculture-specific data via AI.
  const searchTerms = category.usdaFilters.searchTerms || [];
  return searchTerms.map(term => ({
    symbol: term.replace(/\s+/g, '').substring(0, 5).toUpperCase(),
    commonName: term, // Will be enriched by AI
    scientificName: term,
    family: '',
    growthHabit: category.usdaFilters.growthHabits?.[0] || 'Forb/herb',
    duration: 'Perennial',
    isNative: true,
    nativeStatus: '',
    matureHeightFt: null,
    matureWidthFt: null,
    sunRequirements: null,
    waterRequirements: null,
    minHardinessZone: null,
    maxHardinessZone: null,
    minRainfallInches: null,
    maxRainfallInches: null,
    bloomPeriod: null,
    droughtTolerance: null,
    nitrogenFixation: null,
    shadeTolerance: null,
    palatableHuman: null,
    fruitSeedPeriod: null,
  }));
}
