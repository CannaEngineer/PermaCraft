/**
 * Permaculture Data Enrichment Module
 *
 * Uses OpenRouter AI to enrich scraped plant data with permaculture-specific
 * information: functions, companion plants, zone placement, edible parts,
 * regional suitability, and permaculture relevance scoring.
 *
 * This transforms raw USDA botanical data into actionable permaculture
 * design information.
 */

import OpenAI from 'openai';
import type { ScrapedPlant, EnrichedPlant, PermacultureEnrichment } from './types';
import type { CategoryDefinition } from './categories';

const BATCH_SIZE = 10; // Plants per AI request (to manage token limits)
const REQUEST_DELAY_MS = 2000; // Delay between AI calls

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY not set. Set it in .env.local or export it:\n' +
      '  export OPENROUTER_API_KEY=sk-or-...'
    );
  }
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio',
      'X-Title': 'PermaCraft Plant Database Builder',
    },
  });
}

/**
 * Build the system prompt for permaculture enrichment
 */
function buildSystemPrompt(): string {
  return `You are a world-class permaculture designer and ethnobotanist with deep knowledge of:
- Food forest design (based on Martin Crawford, Dave Jacke, Eric Toensmeier)
- Companion planting and guild design
- USDA hardiness zones and regional plant performance across the United States
- Native plant ecology and restoration
- Edible landscaping and forest gardening
- Traditional ecological knowledge

Your task is to enrich plant data with permaculture-specific information.

IMPORTANT RULES:
1. Native species should ALWAYS be prioritized and highlighted
2. For each plant, assess its permaculture relevance: "high" (direct food/nitrogen/essential function), "medium" (useful support species), or "low" (primarily ornamental)
3. Be specific about US regions where plants thrive
4. List companion plants that are commonly available in US nurseries
5. Zone placement should reference permaculture zones (0-5), not hardiness zones
6. Edible parts should include harvest season
7. Be honest about non-native status - mark introduced species clearly

Available permaculture_functions values:
nitrogen_fixer, dynamic_accumulator, wildlife_habitat, pollinator_support,
edible_fruit, edible_nut, edible_leaves, edible_root, edible_flower,
medicinal, timber_production, shade_provider, windbreak, erosion_control,
living_fence, ground_cover, mulch_producer, bee_forage, beneficial_insect_habitat,
soil_builder, water_filtration, carbon_sequestration, pioneer_species,
nurse_plant, trap_crop, aromatic_pest_confuser, fiber_production, dye_plant

Available broad_regions:
Northeast, Mid_Atlantic, Southeast, Midwest, South, West, Southwest, Pacific_Northwest

Available layers:
canopy, understory, shrub, herbaceous, groundcover, vine, root, aquatic`;
}

/**
 * Build the enrichment prompt for a batch of plants
 */
function buildEnrichmentPrompt(plants: ScrapedPlant[], category: CategoryDefinition): string {
  const plantList = plants.map((p, i) => {
    const attrs = [
      `Scientific name: ${p.scientificName}`,
      p.commonName !== p.scientificName ? `Common name: ${p.commonName}` : null,
      p.family ? `Family: ${p.family}` : null,
      p.growthHabit ? `Growth habit: ${p.growthHabit}` : null,
      p.isNative ? 'Native to US' : 'Non-native/Introduced',
      p.matureHeightFt ? `Height: ${p.matureHeightFt}ft` : null,
      p.nitrogenFixation && p.nitrogenFixation !== 'None' ? `N-fixation: ${p.nitrogenFixation}` : null,
      p.bloomPeriod ? `Bloom: ${p.bloomPeriod}` : null,
      p.droughtTolerance ? `Drought tolerance: ${p.droughtTolerance}` : null,
    ].filter(Boolean).join(', ');
    return `${i + 1}. ${attrs}`;
  }).join('\n');

  return `Enrich these ${plants.length} plants from the "${category.label}" category with permaculture data.

PLANTS TO ENRICH:
${plantList}

For each plant, return a JSON array with objects containing:
{
  "index": <number matching the plant number above>,
  "common_name": "<proper common name if the input was just a genus>",
  "scientific_name": "<correct full binomial if input was just genus>",
  "layer": "<canopy|understory|shrub|herbaceous|groundcover|vine|root|aquatic>",
  "permaculture_functions": ["<function1>", "<function2>", ...],
  "companion_plants": ["<Common Name 1>", "<Common Name 2>", ...] (3-6 companions),
  "zone_placement_notes": "<1-2 sentences about optimal permaculture zone placement>",
  "edible_parts": {"<part>": "<season>"} or null if not edible,
  "sourcing_notes": "<1 sentence about availability in US nurseries>",
  "description": "<2-3 sentence description focusing on permaculture value>",
  "broad_regions": ["<region1>", "<region2>", ...],
  "years_to_maturity": <number or null>,
  "permaculture_relevance": "<high|medium|low>",
  "is_native": <true|false>,
  "mature_height_ft": <number or null>,
  "mature_width_ft": <number or null>,
  "sun_requirements": "<Full sun|Full sun to part shade|Part shade|Part shade to full shade|Full shade>" or null,
  "water_requirements": "<Low|Medium|High>" or null,
  "min_hardiness_zone": "<zone number>" or null,
  "max_hardiness_zone": "<zone number>" or null
}

Return ONLY the JSON array, no other text. If a genus was given without a species,
pick the most commonly used/available species in that genus for US permaculture.`;
}

/**
 * Parse AI response into enrichment data
 */
function parseEnrichmentResponse(response: string, plants: ScrapedPlant[]): (PermacultureEnrichment & {
  commonNameOverride?: string;
  scientificNameOverride?: string;
  isNativeOverride?: boolean;
  heightOverride?: number | null;
  widthOverride?: number | null;
  sunOverride?: string | null;
  waterOverride?: string | null;
  minZoneOverride?: string | null;
  maxZoneOverride?: string | null;
})[] {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  // Also handle case where response starts with [ but has trailing text
  const arrayMatch = jsonStr.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    jsonStr = arrayMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      console.warn('  AI response was not an array, wrapping...');
      return [parsed];
    }

    return parsed.map((item: Record<string, unknown>) => ({
      layer: (item.layer as string) || 'herbaceous',
      permacultureFunctions: (item.permaculture_functions as string[]) || [],
      companionPlants: (item.companion_plants as string[]) || [],
      zonePlacementNotes: (item.zone_placement_notes as string) || '',
      edibleParts: (item.edible_parts as Record<string, string>) || null,
      sourcingNotes: (item.sourcing_notes as string) || '',
      description: (item.description as string) || '',
      broadRegions: (item.broad_regions as string[]) || [],
      yearsToMaturity: (item.years_to_maturity as number) || null,
      permacultureRelevance: (item.permaculture_relevance as 'high' | 'medium' | 'low') || 'medium',
      commonNameOverride: (item.common_name as string) || undefined,
      scientificNameOverride: (item.scientific_name as string) || undefined,
      isNativeOverride: item.is_native as boolean | undefined,
      heightOverride: (item.mature_height_ft as number) ?? null,
      widthOverride: (item.mature_width_ft as number) ?? null,
      sunOverride: (item.sun_requirements as string) ?? null,
      waterOverride: (item.water_requirements as string) ?? null,
      minZoneOverride: (item.min_hardiness_zone as string) ?? null,
      maxZoneOverride: (item.max_hardiness_zone as string) ?? null,
    }));
  } catch (err) {
    console.error('  Failed to parse AI response:', (err as Error).message);
    console.error('  Response preview:', jsonStr.substring(0, 200));
    return [];
  }
}

/**
 * Enrich a batch of plants using AI
 */
async function enrichBatch(
  client: OpenAI,
  plants: ScrapedPlant[],
  category: CategoryDefinition,
  model: string,
): Promise<EnrichedPlant[]> {
  const prompt = buildEnrichmentPrompt(plants, category);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temp for more consistent structured output
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const enrichments = parseEnrichmentResponse(responseText, plants);

    return plants.map((plant, idx) => {
      const enrichment = enrichments[idx];
      if (!enrichment) {
        // Fallback enrichment if AI didn't return data for this plant
        return {
          ...plant,
          enrichment: {
            layer: category.defaultLayer,
            permacultureFunctions: [],
            companionPlants: [],
            zonePlacementNotes: '',
            edibleParts: null,
            sourcingNotes: '',
            description: plant.commonName,
            broadRegions: [],
            yearsToMaturity: null,
            permacultureRelevance: 'medium' as const,
          },
        };
      }

      // Apply AI overrides where the scraped data was missing
      const enriched: EnrichedPlant = {
        ...plant,
        commonName: enrichment.commonNameOverride || plant.commonName,
        scientificName: enrichment.scientificNameOverride || plant.scientificName,
        isNative: enrichment.isNativeOverride ?? plant.isNative,
        matureHeightFt: plant.matureHeightFt ?? enrichment.heightOverride ?? null,
        matureWidthFt: plant.matureWidthFt ?? enrichment.widthOverride ?? null,
        sunRequirements: plant.sunRequirements ?? enrichment.sunOverride ?? null,
        waterRequirements: plant.waterRequirements ?? enrichment.waterOverride ?? null,
        minHardinessZone: plant.minHardinessZone ?? enrichment.minZoneOverride ?? null,
        maxHardinessZone: plant.maxHardinessZone ?? enrichment.maxZoneOverride ?? null,
        enrichment: {
          layer: enrichment.layer,
          permacultureFunctions: enrichment.permacultureFunctions,
          companionPlants: enrichment.companionPlants,
          zonePlacementNotes: enrichment.zonePlacementNotes,
          edibleParts: enrichment.edibleParts,
          sourcingNotes: enrichment.sourcingNotes,
          description: enrichment.description,
          broadRegions: enrichment.broadRegions,
          yearsToMaturity: enrichment.yearsToMaturity,
          permacultureRelevance: enrichment.permacultureRelevance,
        },
      };
      return enriched;
    });
  } catch (err) {
    console.error(`  AI enrichment failed: ${(err as Error).message}`);
    // Return plants with empty enrichment on failure
    return plants.map(plant => ({
      ...plant,
      enrichment: {
        layer: category.defaultLayer,
        permacultureFunctions: [],
        companionPlants: [],
        zonePlacementNotes: '',
        edibleParts: null,
        sourcingNotes: '',
        description: '',
        broadRegions: [],
        yearsToMaturity: null,
        permacultureRelevance: 'medium' as const,
      },
    }));
  }
}

/**
 * Enrich all scraped plants in a category with permaculture data.
 * Processes in batches to stay within AI token limits.
 */
export async function enrichPlants(
  plants: ScrapedPlant[],
  category: CategoryDefinition,
  options: { model?: string } = {},
): Promise<EnrichedPlant[]> {
  const model = options.model || 'meta-llama/llama-3.2-90b-vision-instruct:free';
  const client = getOpenRouterClient();
  const enriched: EnrichedPlant[] = [];

  console.log(`\n  Enriching ${plants.length} plants with permaculture data...`);
  console.log(`  Using model: ${model}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);

  const totalBatches = Math.ceil(plants.length / BATCH_SIZE);

  for (let i = 0; i < plants.length; i += BATCH_SIZE) {
    const batch = plants.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`    Batch ${batchNum}/${totalBatches} (${batch.length} plants)...`);

    const result = await enrichBatch(client, batch, category, model);
    enriched.push(...result);

    if (i + BATCH_SIZE < plants.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const highRelevance = enriched.filter(p => p.enrichment.permacultureRelevance === 'high').length;
  const medRelevance = enriched.filter(p => p.enrichment.permacultureRelevance === 'medium').length;
  const lowRelevance = enriched.filter(p => p.enrichment.permacultureRelevance === 'low').length;

  console.log(`  Enrichment complete: ${highRelevance} high, ${medRelevance} medium, ${lowRelevance} low relevance`);

  return enriched;
}
