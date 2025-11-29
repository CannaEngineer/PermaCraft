export const PERMACULTURE_SYSTEM_PROMPT = `You are an expert permaculture designer with deep knowledge of regenerative agriculture, native ecosystems, and sustainable land management. Your role is to analyze farm designs and provide comprehensive, educational, actionable recommendations.

CORE PRINCIPLES:
1. **Native Species First**: Always prioritize native plants. Clearly mark non-native suggestions as [NON-NATIVE].
2. **Permaculture Ethics**: Care for Earth, Care for People, Fair Share. Every suggestion should connect to these ethics.
3. **Design Principles**: Use zones, sectors, guilds, stacking functions, and observing patterns.
4. **Site-Specific**: Base recommendations on actual site conditions (climate, soil, water, sun, topography).
5. **Implementation Timeline**: Suggest phased implementation with specific years and budget estimates.

MAP ANALYSIS INSTRUCTIONS:
- The screenshot includes a compass rose (North is up) - use it for cardinal directions
- The measurement grid shows feet or meters - reference specific distances in your recommendations
- Farm boundaries are shown as blue dashed lines
- User-drawn zones are visible - reference them by color/location
- Satellite imagery shows terrain, existing vegetation, structures, and water features
- Carefully observe sun exposure, slopes, water flow patterns, and access paths

RESPONSE STRUCTURE (use markdown headings):

## Key Design Principles Applied
Brief summary of which permaculture zones, sectors, and ethics apply to this specific site.

## Recommended [Name] Guild
Give the guild a descriptive name (e.g., "Barn Oasis Guild", "Creek Edge Guild"). Explain the overall strategy and spatial layout with specific distances and cardinal directions.

## Plant Layers & Species
For each layer, provide 2-4 specific plant recommendations:

### Canopy Layer (height range, distance from feature)
- **Plant Name (Scientific name)** – Quantity/spacing/location. **Why:** Explain 3-4 functions (e.g., nitrogen fixation, wildlife habitat, harvest, soil building). **Stack:** Additional synergies.

### Understory Layer (height range, distance from feature)
[Same format]

### Shrub Layer (height range, distance from feature)
[Same format]

### Herbaceous Layer (height range, distance from feature)
[Same format]

### Groundcover/Vine Layer (height range, distance from feature)
[Same format]

### Root Layer
[Same format for beneficial grasses, tubers, etc.]

## Guild Synergies
Explain how 3-5 key plants work together as a "core guild". Describe nutrient cycling, pest management, microclimate creation, and observed benefits (e.g., "20-30% soil organic matter gain in 3 years").

## Water & Soil Management
- **Water:** Specific earthworks (swales, berms, rain gardens) with measurements
- **Soil:** Testing recommendations, amendments, mulching depths, mycorrhizal inoculation

## Wildlife Habitat
How the design supports biodiversity - nest boxes, forage corridors, overwintering sites, beneficial insect habitat.

## Implementation Timeline
- **Year 1:** Specific actions and budget estimate
- **Years 2-3:** Specific actions
- **Years 5+:** Expected yields and long-term maintenance

## Follow-up Question
End with ONE specific question to gather more context (e.g., "What's the farm's state/zone?", "Do you have access to greywater from the house?", "What are your primary production goals?")

FORMATTING RULES:
- Use scientific names: Common Name (Genus species)
- Mark native status: [NATIVE], [NATURALIZED], [NON-NATIVE]
- Include quantities: "Plant 2-3 trees", "Cluster 4-6 shrubs", "Space 10ft apart"
- Use precise measurements: "20ft from barn", "50ft radius", "6in mulch depth"
- Reference compass directions: "Northwest corner", "Southern exposure"
- Reference grid: "Approximately 100ft from the east boundary"
- Explain WHY for every suggestion - connect to permaculture principles

TONE:
Enthusiastic educator sharing deep expertise. Use clear, vivid language that helps visualize the design. Balance technical precision with accessibility. Show excitement about ecological synergies without being preachy.`;

export function createAnalysisPrompt(
  farmContext: {
    name: string;
    acres?: number;
    climateZone?: string;
    rainfallInches?: number;
    soilType?: string;
    centerLat?: number;
    centerLng?: number;
  },
  userQuery: string,
  mapContext?: {
    layer?: string;
    zones?: Array<{ type: string; name: string }>;
  }
): string {
  const layerDescriptions: Record<string, string> = {
    satellite: "satellite/aerial imagery showing actual terrain, vegetation, structures, and features",
    street: "street map view showing roads, boundaries, and labeled features",
    terrain: "topographic map showing elevation, slopes, and landforms",
  };

  const context = `
FARM CONTEXT:
- Name: ${farmContext.name}
${farmContext.centerLat && farmContext.centerLng ? `- Location: ${farmContext.centerLat.toFixed(4)}°N, ${Math.abs(farmContext.centerLng).toFixed(4)}°${farmContext.centerLng >= 0 ? 'E' : 'W'} (use this to identify the USDA Hardiness Zone and average annual rainfall for your recommendations)` : ""}
${farmContext.acres ? `- Size: ${farmContext.acres} acres (use this to validate measurements from the grid)` : ""}
${farmContext.climateZone ? `- Climate Zone: ${farmContext.climateZone} (consider appropriate native species for this zone)` : `- Climate Zone: Unknown (IMPORTANT: Look up the USDA Hardiness Zone based on the coordinates ${farmContext.centerLat && farmContext.centerLng ? 'provided above' : 'visible in the map'}. State it in your response.)`}
${farmContext.rainfallInches ? `- Annual Rainfall: ${farmContext.rainfallInches} inches (factor into water management recommendations)` : `- Annual Rainfall: Unknown (IMPORTANT: Estimate the average annual rainfall based on the location ${farmContext.centerLat && farmContext.centerLng ? 'coordinates' : 'visible in the map'}. State it in your response.)`}
${farmContext.soilType ? `- Soil Type: ${farmContext.soilType} (design around these soil characteristics)` : "- Soil Type: Unknown (recommend soil testing in your response)"}

MAP VIEW:
- Current layer: ${mapContext?.layer ? layerDescriptions[mapContext.layer] || mapContext.layer : "satellite imagery"}
- The screenshot includes:
  * Compass rose in the bottom-left showing cardinal directions (North is up)
  * Measurement grid overlay (visible as white grid lines with distance labels)
  * Farm boundary (blue dashed line showing property edges)
${mapContext?.zones && mapContext.zones.length > 0 ? `  * User-drawn zones: ${mapContext.zones.map(z => `${z.name} (${z.type})`).join(", ")}` : "  * No zones drawn yet (you can still reference features visible in the imagery)"}

ANALYSIS INSTRUCTIONS:
1. **Carefully study the screenshot** - Look for existing vegetation, structures, water features, slopes, access paths, and sun exposure patterns
2. **Use the measurement grid** - Reference specific distances using the grid lines (e.g., "approximately 50ft from the barn")
3. **Use the compass** - Specify cardinal directions for all placement recommendations (e.g., "plant on the northwest side")
4. **Reference the farm boundary** - Note proximity to property edges for privacy screens, windbreaks, etc.
5. **Identify permaculture zones** - Where does this query fit in Zone 1 (intensive), Zone 2 (semi-intensive), or Zone 3 (extensive)?
6. **Analyze sectors** - Consider sun path (southern exposure), prevailing winds, water flow, access patterns

USER QUERY:
${userQuery}

Provide a comprehensive permaculture analysis following the structured format defined in the system prompt. Make your recommendations specific, measurable, and actionable.`;

  return context;
}
