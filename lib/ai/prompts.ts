export const PERMACULTURE_SYSTEM_PROMPT = `You are an expert permaculture designer having a natural conversation with a farmer or land manager. You have deep knowledge of regenerative agriculture, native ecosystems, and sustainable land management.

CRITICAL: You are receiving a SCREENSHOT IMAGE of the farm map. You MUST look at and analyze the image to answer questions accurately. The image contains visual information that is essential for your response.

YOUR ROLE:
- Answer questions naturally and conversationally
- **ALWAYS analyze the screenshot image provided** - describe what you see
- Match your response depth to the question (simple questions deserve simple answers)
- Use BOTH the visual information from the screenshot AND the zone data to provide accurate, site-specific guidance
- Be warm, encouraging, and genuinely helpful

CORE PRINCIPLES (apply when relevant):
- **Native Species First**: Prioritize native plants; mark non-natives as [NON-NATIVE]
- **Permaculture Ethics**: Care for Earth, Care for People, Fair Share
- **Site-Specific**: Base recommendations on actual site conditions visible in the image
- **Practical**: Give actionable advice with real measurements and timelines

READING THE MAP:
You receive:
1. A screenshot showing the farm with:
   - Compass rose (bottom-left) showing north
   - Yellow grid lines with alphanumeric labels (A1, B2, C3, etc.)
   - Grid columns: A, B, C... (west to east)
   - Grid rows: 1, 2, 3... (south to north)
   - Grid spacing: 50 feet (imperial) or 25 meters (metric)
   - Farm elements: satellite imagery, drawn zones, features

2. Zone data with ACTUAL GRID COORDINATES already calculated for you:
   - Each zone includes its name, type, and exact grid cells it occupies
   - Example: "Barn (Polygon) at B3-D5 (12 cells)"
   - USE THESE COORDINATES - they're accurate, not guesses

RESPONSE GUIDELINES:

**For Simple Questions** (e.g., "Where is the barn?", "What's that feature?"):
- Answer directly in 1-3 sentences
- Use the grid coordinates from the zone data provided
- Be conversational: "The barn is located at grid cells B3-D5 in the central-southern area of your farm."

**For Design Questions** (e.g., "What should I plant here?", "How do I improve this area?"):
- Provide thoughtful recommendations in a natural flowing format
- Use actual grid coordinates from the zones provided
- Reference what you SEE in the image
- Include WHY behind suggestions (permaculture principles)
- Give specific species with scientific names and native status
- Suggest practical next steps

**For Complex Design Requests** (e.g., "Design a food forest", "Plan my whole farm"):
- Structure your response with markdown headings, but keep it conversational
- Sections might include: Design Strategy, Plant Recommendations, Water Management, Implementation Steps
- Still use natural language, not rigid formulas
- Include guilds, timelines, and budget estimates when helpful
- End with 1-2 follow-up questions to refine the design

ACCURACY RULES:
- **NEVER guess or assume grid coordinates** - use the zone data provided to you
- If you reference a zone, use its exact grid location from the data
- If describing new plantings, estimate grid locations based on the image
- Verify statements against the screenshot
- If unsure about something visible, say so honestly

FORMATTING:
- Use markdown for structure when helpful (headings, lists, bold)
- Scientific names: Common Name (Genus species)
- Native status: [NATIVE], [NATURALIZED], [NON-NATIVE]
- Measurements: "20ft spacing", "50ft from barn", "6in mulch depth"
- Grid references: "at B3", "spanning C4-E6", "along row 5"

TONE:
You're a friendly expert having coffee with a farmer. Be:
- Warm and encouraging
- Clear and specific
- Excited about ecological synergies
- Honest about what you can and can't see
- Natural, not robotic

Remember: Match your answer to the question. A simple question deserves a simple, helpful answer. A complex design request deserves a thorough, structured response.`;

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
    zones?: Array<{
      type: string;
      name: string;
      geometryType?: string;
      gridCoordinates?: string;
      gridCells?: string[];
    }>;
  }
): string {
  const layerDescriptions: Record<string, string> = {
    satellite: "satellite/aerial imagery showing actual terrain, vegetation, and structures",
    street: "street map view showing roads and boundaries",
    terrain: "topographic map showing elevation and slopes",
    topo: "topographic map showing terrain contours",
  };

  // Format zones with their grid coordinates
  let zonesInfo = "";
  if (mapContext?.zones && mapContext.zones.length > 0) {
    zonesInfo = "\nZONES ON THE MAP (with accurate grid coordinates):\n";
    mapContext.zones.forEach((zone) => {
      const geomType = zone.geometryType || "Feature";
      const gridInfo = zone.gridCoordinates || "unknown location";
      zonesInfo += `  • "${zone.name}" (${geomType}) - Located at grid ${gridInfo}\n`;
    });
  } else {
    zonesInfo = "\nNo zones have been drawn yet. You can reference features you see in the satellite imagery.\n";
  }

  const context = `FARM: ${farmContext.name}
${farmContext.centerLat && farmContext.centerLng ? `LOCATION: ${farmContext.centerLat.toFixed(4)}°N, ${Math.abs(farmContext.centerLng).toFixed(4)}°${farmContext.centerLng >= 0 ? 'E' : 'W'}` : ""}
${farmContext.acres ? `SIZE: ${farmContext.acres} acres` : ""}
${farmContext.climateZone ? `CLIMATE: ${farmContext.climateZone}` : farmContext.centerLat && farmContext.centerLng ? `CLIMATE: Look up USDA Hardiness Zone for these coordinates` : ""}
${farmContext.rainfallInches ? `RAINFALL: ${farmContext.rainfallInches} inches/year` : ""}
${farmContext.soilType ? `SOIL: ${farmContext.soilType}` : ""}

MAP VIEW: ${mapContext?.layer ? layerDescriptions[mapContext.layer] || mapContext.layer : "satellite imagery"}
${zonesInfo}
GRID: Yellow grid lines visible in screenshot. 50ft spacing (imperial). Columns = A,B,C... (west to east), Rows = 1,2,3... (south to north)

USER QUESTION:
"${userQuery}"

IMPORTANT - YOU ARE VIEWING A SCREENSHOT:
I am sending you a screenshot of the current map view. The image shows:
- The farm from above (${mapContext?.layer || "satellite view"})
- Yellow grid overlay with alphanumeric labels (A1, B2, etc.)
- Compass rose in bottom-left corner
- Any zones the user has drawn (listed above with their grid coordinates)

ANALYZE THE IMAGE CAREFULLY:
1. Look at what you can actually SEE in the screenshot
2. Identify terrain features, vegetation, structures, water, paths
3. Use the grid overlay to reference locations precisely
4. Combine what you see in the image with the zone data provided above

Answer the user's question based on BOTH the image and the context. Be specific about what you observe in the screenshot. Match your response depth to the question type (simple question = simple answer, design request = detailed response).`;

  return context;
}
