import type { Species } from '@/lib/db/schema';

export function buildNarrativePrompt(species: Species): string {
  const regions = species.broad_regions ? JSON.parse(species.broad_regions) : [];
  const functions = species.permaculture_functions ? JSON.parse(species.permaculture_functions) : [];
  const edibleParts = species.edible_parts ? JSON.parse(species.edible_parts) : {};

  return `You are an expert permaculture educator and ecological storyteller. Generate an engaging narrative about the following plant species, focusing on its ecological role, permaculture value, and cultural significance.

SPECIES:
- Common Name: ${species.common_name}
- Scientific Name: ${species.scientific_name}
- Layer: ${species.layer}
- Native Status: ${species.is_native === 1 ? 'Native' : 'Naturalized/Non-native'}
- Regions: ${regions.length > 0 ? regions.join(', ') : 'Unknown'}
- Permaculture Functions: ${functions.length > 0 ? functions.join(', ') : 'Unknown'}
- Edible Parts: ${Object.keys(edibleParts).length > 0 ? Object.entries(edibleParts).map(([k, v]) => `${k}${v ? `: ${v}` : ''}`).join(', ') : 'None listed'}
${species.description ? `- Existing Description: ${species.description}` : ''}
${species.zone_placement_notes ? `- Zone Placement: ${species.zone_placement_notes}` : ''}

Generate a JSON response with exactly these fields:
{
  "narrative_summary": "A compelling 2-3 sentence summary of why this plant matters ecologically and in permaculture design. Should hook the reader.",
  "narrative_full": "A 400-600 word markdown narrative covering: (1) ecological role and native habitat, (2) permaculture value and stacking functions, (3) cultural or historical significance, (4) why it deserves a place in a thoughtful design. Use headers (##) to organize sections. Write in an engaging, educational tone."
}

Important guidelines:
- Connect every point to established permaculture ethics (earth care, people care, fair share)
- Reference specific permaculture principles where relevant
- If the plant is native, emphasize the value of native species
- If non-native, acknowledge this honestly and discuss appropriate use
- Use markdown formatting in narrative_full (headers, bold, bullet points)
- Return ONLY valid JSON, no other text`;
}

export function buildGrowingGuidePrompt(species: Species): string {
  return `You are a permaculture growing expert. Generate a practical growing guide for the following species.

SPECIES:
- Common Name: ${species.common_name}
- Scientific Name: ${species.scientific_name}
- Layer: ${species.layer}
- Sun: ${species.sun_requirements || 'Unknown'}
- Water: ${species.water_requirements || 'Unknown'}
- Hardiness Zones: ${species.min_hardiness_zone && species.max_hardiness_zone ? `${species.min_hardiness_zone}-${species.max_hardiness_zone}` : 'Unknown'}
- Mature Height: ${species.mature_height_ft ? `${species.mature_height_ft} ft` : 'Unknown'}
- Mature Width: ${species.mature_width_ft ? `${species.mature_width_ft} ft` : 'Unknown'}
- Years to Maturity: ${species.years_to_maturity || 'Unknown'}
${species.zone_placement_notes ? `- Zone Placement Notes: ${species.zone_placement_notes}` : ''}

Generate a JSON response with exactly these fields:
{
  "growing_guide_summary": "A bullet-point quick reference in markdown format covering: sun, water, soil, spacing, and season. Use - for bullet points. Keep it scannable.",
  "growing_guide": "A 300-500 word markdown growing guide covering: (1) Site selection and soil preparation, (2) Planting technique and timing, (3) Watering and maintenance in the first years, (4) Companion planting suggestions from a permaculture perspective, (5) Common challenges and solutions. Use ## headers to organize. Practical, actionable advice."
}

Important guidelines:
- Focus on organic, permaculture-aligned practices (no synthetic chemicals)
- Mention mulching, composting, and guild planting where relevant
- Include seasonal timing cues
- Return ONLY valid JSON, no other text`;
}
