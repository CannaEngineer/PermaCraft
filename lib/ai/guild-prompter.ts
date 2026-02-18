export interface GuildSuggestionContext {
  focalSpecies: {
    scientific_name: string;
    common_name: string;
    native_region?: string;
    layer: string;
  };
  farmContext: {
    climate_zone: string;
    soil_type?: string;
    rainfall_inches?: number;
  };
  constraints?: {
    prefer_native?: boolean;
    edible_focus?: boolean;
    max_companions?: number;
  };
}

export function buildGuildSuggestionPrompt(context: GuildSuggestionContext): string {
  return `You are a permaculture design expert specializing in plant guilds. Generate a companion planting guild for the following focal species.

FOCAL SPECIES:
- Scientific Name: ${context.focalSpecies.scientific_name}
- Common Name: ${context.focalSpecies.common_name}
- Native Region: ${context.focalSpecies.native_region || 'Unknown'}
- Layer: ${context.focalSpecies.layer}

SITE CONDITIONS:
- Climate Zone: ${context.farmContext.climate_zone}
- Soil Type: ${context.farmContext.soil_type || 'Unknown'}
- Annual Rainfall: ${context.farmContext.rainfall_inches ? `${context.farmContext.rainfall_inches} inches` : 'Unknown'}

DESIGN CONSTRAINTS:
${context.constraints?.prefer_native ? '- Prefer native species to the region' : ''}
${context.constraints?.edible_focus ? '- Emphasize edible companions' : ''}
${context.constraints?.max_companions ? `- Maximum ${context.constraints.max_companions} companion species` : ''}

Please suggest 3-6 companion species that would form a beneficial guild. For each companion, provide:
1. Scientific name
2. Common name
3. Layer (canopy, understory, shrub, herbaceous, groundcover, vine)
4. Primary benefit (nitrogen fixation, pest control, pollinator attraction, dynamic accumulator, mulch production, etc.)
5. Recommended spacing from focal species (in feet)
6. Quantity to plant
7. Brief explanation of why this species works well

Format your response as valid JSON matching this structure:
{
  "guild_name": "Descriptive name for this guild",
  "companions": [
    {
      "scientific_name": "Genus species",
      "common_name": "Common Name",
      "layer": "herbaceous",
      "primary_benefit": "nitrogen_fixation",
      "min_distance_feet": 2,
      "max_distance_feet": 8,
      "count": 4,
      "explanation": "Why this works..."
    }
  ],
  "general_notes": "Overall guild strategy and care tips"
}

Focus on permaculture principles: stacking functions, beneficial relationships, native plants when possible, and ecological resilience.

IMPORTANT: Do not offer, suggest, or ask if the user wants any visual representation, diagram, chart, or graphical output — you do not have this capability. Return only the JSON.`;
}
