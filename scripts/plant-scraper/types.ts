/**
 * Types for the plant database scraper system
 */

export interface USDAPlant {
  Symbol: string;           // e.g. "QUERU"
  Scientific_Name: string;  // e.g. "Quercus rubra"
  Common_Name: string;      // e.g. "red oak"
  Family: string;
  Duration: string;         // "Perennial", "Annual", "Biennial"
  Growth_Habit: string;     // "Tree", "Shrub", "Forb/herb", "Graminoid", "Vine", "Subshrub"
  Native_Status: string;    // "L48(N)" = native to lower 48, "L48(I)" = introduced
  Active_Growth_Period?: string;
  Bloom_Period?: string;
  Drought_Tolerance?: string;
  Fertility_Requirement?: string;
  Fire_Tolerance?: string;
  Flower_Color?: string;
  Foliage_Color?: string;
  Fruit_Seed_Period_Begin?: string;
  Fruit_Seed_Period_End?: string;
  Height_Mature_ft?: number;
  Lifespan?: string;
  Moisture_Use?: string;     // "Low", "Medium", "High"
  Nitrogen_Fixation?: string; // "None", "Low", "Medium", "High"
  pH_Minimum?: number;
  pH_Maximum?: number;
  Precipitation_Minimum?: number;
  Precipitation_Maximum?: number;
  Shade_Tolerance?: string;
  Temperature_Minimum_F?: number;
  Toxicity?: string;
  Adapted_to_Coarse_Textured_Soils?: string;
  Adapted_to_Fine_Textured_Soils?: string;
  Adapted_to_Medium_Textured_Soils?: string;
  Palatable_Browse_Animal?: string;
  Palatable_Graze_Animal?: string;
  Palatable_Human?: string;
  Berry_Nut_Seed_Product?: string;
  Christmas_Tree_Product?: string;
  Fodder_Product?: string;
  Lumber_Product?: string;
  Naval_Store_Product?: string;
  Nursery_Stock_Product?: string;
  Veneer_Product?: string;
}

export interface ScrapedPlant {
  symbol: string;
  commonName: string;
  scientificName: string;
  family: string;
  growthHabit: string;
  duration: string;
  isNative: boolean;
  nativeStatus: string;
  matureHeightFt: number | null;
  matureWidthFt: number | null;
  sunRequirements: string | null;
  waterRequirements: string | null;
  minHardinessZone: string | null;
  maxHardinessZone: string | null;
  minRainfallInches: number | null;
  maxRainfallInches: number | null;
  bloomPeriod: string | null;
  droughtTolerance: string | null;
  nitrogenFixation: string | null;
  shadeTolerance: string | null;
  palatableHuman: string | null;
  fruitSeedPeriod: string | null;
}

export interface PermacultureEnrichment {
  layer: string;
  permacultureFunctions: string[];
  companionPlants: string[];
  zonePlacementNotes: string;
  edibleParts: Record<string, string> | null;
  sourcingNotes: string;
  description: string;
  broadRegions: string[];
  yearsToMaturity: number | null;
  permacultureRelevance: 'high' | 'medium' | 'low';
}

export interface EnrichedPlant extends ScrapedPlant {
  enrichment: PermacultureEnrichment;
}

export type PlantCategory =
  | 'food_forest_trees'
  | 'fruit_nut_trees'
  | 'nitrogen_fixers'
  | 'native_trees'
  | 'native_shrubs'
  | 'berry_bushes'
  | 'herbaceous_perennials'
  | 'culinary_herbs'
  | 'medicinal_herbs'
  | 'vegetables_annuals'
  | 'cover_crops'
  | 'groundcovers'
  | 'vines'
  | 'aquatic_plants'
  | 'pollinator_plants'
  | 'windbreak_species'
  | 'ornamental_natives'
  | 'grasses_sedges';

export interface ScrapeConfig {
  category: PlantCategory;
  batchSize: number;
  regions: string[];
  prioritizePermaculture: boolean;
  outputDir: string;
}

export interface ScrapeResult {
  category: PlantCategory;
  totalFetched: number;
  totalEnriched: number;
  outputFile: string;
  errors: string[];
}
