/**
 * Farm Report Generation Prompts for MiniMax M2.5
 *
 * MiniMax M2.5 excels at structured document generation, planning optimization,
 * and producing office-ready output (spreadsheet data, structured plans).
 * These prompts leverage those strengths to generate comprehensive farm reports.
 */

/**
 * System prompt for comprehensive farm report generation.
 *
 * Instructs M2.5 to produce a structured JSON report covering all aspects
 * of a permaculture farm plan — suitable for rendering as a professional
 * document or spreadsheet export.
 */
export const FARM_REPORT_SYSTEM_PROMPT = `You are an expert permaculture farm planner generating a comprehensive, professional farm report. You produce structured, actionable documents that farmers can use for planning, grant applications, and implementation tracking.

Your reports are data-rich, precise, and organized for practical use. You excel at:
- Creating structured planting schedules with timelines
- Estimating material costs and labor requirements
- Generating implementation phases with dependencies
- Producing species lists with ecological function analysis
- Identifying gaps in permaculture function coverage

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "report_title": "Comprehensive Farm Plan: [Farm Name]",
  "generated_date": "YYYY-MM-DD",
  "executive_summary": "2-3 paragraph overview of the farm's current state, key strengths, gaps, and recommended next steps",
  "site_analysis": {
    "climate_assessment": "Climate zone interpretation with growing season, frost dates, precipitation patterns",
    "soil_assessment": "Soil type analysis with amendment recommendations",
    "water_management": "Current water features, drainage patterns, irrigation needs",
    "microclimate_notes": "Identified microclimates and their design implications"
  },
  "biodiversity_scorecard": {
    "total_species": 0,
    "native_percentage": 0,
    "layer_coverage": { "canopy": 0, "understory": 0, "shrub": 0, "herbaceous": 0, "groundcover": 0, "vine": 0, "root": 0 },
    "function_coverage": {
      "nitrogen_fixers": 0,
      "pollinator_support": 0,
      "pest_control": 0,
      "edible_production": 0,
      "medicinal": 0,
      "erosion_control": 0,
      "windbreak": 0
    },
    "gaps": ["List of missing or under-represented functions"],
    "recommendations": ["Specific species to add with rationale"]
  },
  "planting_schedule": [
    {
      "phase": "Phase name (e.g., Year 1 - Foundation)",
      "timeline": "Season and year",
      "tasks": [
        {
          "task": "Description of planting or preparation task",
          "species": "Common Name (Scientific name) or null for non-planting tasks",
          "quantity": "Estimated count or area",
          "spacing": "Recommended spacing",
          "location_notes": "Where on the farm",
          "estimated_cost_usd": 0,
          "labor_hours": 0,
          "priority": "critical|high|medium|low",
          "dependencies": ["Tasks that must complete first"]
        }
      ]
    }
  ],
  "material_estimates": [
    {
      "category": "Plants|Soil Amendments|Infrastructure|Tools|Irrigation",
      "items": [
        { "item": "Item name", "quantity": "Amount with units", "unit_cost_usd": 0, "total_cost_usd": 0, "source_notes": "Where to obtain" }
      ],
      "subtotal_usd": 0
    }
  ],
  "total_estimated_cost_usd": 0,
  "maintenance_calendar": {
    "spring": ["Monthly maintenance tasks for spring"],
    "summer": ["Monthly maintenance tasks for summer"],
    "fall": ["Monthly maintenance tasks for fall"],
    "winter": ["Monthly maintenance tasks for winter"]
  },
  "yield_projections": [
    {
      "year": 1,
      "expected_yields": ["What to expect in year 1"],
      "revenue_potential_usd": 0
    },
    {
      "year": 3,
      "expected_yields": ["What to expect by year 3"],
      "revenue_potential_usd": 0
    },
    {
      "year": 5,
      "expected_yields": ["What to expect by year 5"],
      "revenue_potential_usd": 0
    }
  ],
  "risk_assessment": [
    {
      "risk": "Description of risk",
      "likelihood": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "next_steps": [
    {
      "action": "Specific next action",
      "timeline": "When to do it",
      "priority": "critical|high|medium|low"
    }
  ]
}

RULES:
- Only reference species and features that exist in the provided farm data
- If data is sparse, clearly state assumptions and mark estimates with "(estimated)"
- Use scientific names in parentheses: Common Name (Genus species)
- Mark native status: [NATIVE], [NON-NATIVE]
- Cost estimates should be reasonable US averages; note when regional pricing may vary
- Planting schedules should respect the farm's climate zone and frost dates
- Connect every recommendation to a permaculture principle
- Be conservative with yield projections — under-promise, over-deliver
- Return ONLY valid JSON, no markdown fences or extra text`;

/**
 * Build the user prompt for report generation with full farm context.
 */
export function createReportGenerationPrompt(
  farm: {
    name: string;
    description?: string | null;
    acres?: number | null;
    climate_zone?: string | null;
    soil_type?: string | null;
    rainfall_inches?: number | null;
    center_lat?: number;
    center_lng?: number;
  },
  zones: Array<{ name: string | null; zone_type: string; properties?: string | null }>,
  plantings: Array<{
    common_name: string;
    scientific_name: string;
    layer: string;
    is_native: number;
    planted_year?: number | null;
    permaculture_functions: string | null;
  }>,
  goals: Array<{
    goal_category: string;
    description: string;
    priority?: string | null;
    target_date?: number | null;
  }>,
  harvestData?: Array<{
    month: string;
    total_quantity: number;
    unit: string;
    harvest_count: number;
  }>,
  reportFocus?: string
): string {
  const parts: string[] = [];

  parts.push(`FARM: ${farm.name}`);
  if (farm.description) parts.push(`DESCRIPTION: ${farm.description}`);
  if (farm.acres) parts.push(`SIZE: ${farm.acres} acres`);
  if (farm.climate_zone) parts.push(`CLIMATE ZONE: ${farm.climate_zone}`);
  if (farm.soil_type) parts.push(`SOIL TYPE: ${farm.soil_type}`);
  if (farm.rainfall_inches) parts.push(`ANNUAL RAINFALL: ${farm.rainfall_inches} inches`);
  if (farm.center_lat && farm.center_lng) {
    parts.push(`COORDINATES: ${farm.center_lat.toFixed(4)}°N, ${Math.abs(farm.center_lng).toFixed(4)}°${farm.center_lng >= 0 ? 'E' : 'W'}`);
  }

  if (zones.length > 0) {
    parts.push('\nZONES AND FEATURES:');
    for (const z of zones) {
      let extra = '';
      if (z.properties) {
        try {
          const props = typeof z.properties === 'string' ? JSON.parse(z.properties) : z.properties;
          if (props.area_acres) extra = ` — ${props.area_acres.toFixed(2)} acres`;
        } catch { /* skip */ }
      }
      parts.push(`  - ${z.name || 'Unnamed'} (${z.zone_type})${extra}`);
    }
  } else {
    parts.push('\nNo zones defined yet.');
  }

  if (plantings.length > 0) {
    parts.push('\nCURRENT PLANTINGS:');
    const byLayer = new Map<string, typeof plantings>();
    for (const p of plantings) {
      const list = byLayer.get(p.layer) || [];
      list.push(p);
      byLayer.set(p.layer, list);
    }
    for (const [layer, species] of byLayer) {
      parts.push(`  ${layer.toUpperCase()} LAYER:`);
      for (const s of species) {
        const native = s.is_native ? '[NATIVE]' : '[NON-NATIVE]';
        const year = s.planted_year ? ` (planted ${s.planted_year})` : '';
        const funcs = s.permaculture_functions ? ` — ${s.permaculture_functions}` : '';
        parts.push(`    - ${s.common_name} (${s.scientific_name}) ${native}${year}${funcs}`);
      }
    }
  } else {
    parts.push('\nNo plantings yet — this is a new farm design.');
  }

  if (goals.length > 0) {
    parts.push('\nFARMER GOALS:');
    for (const g of goals) {
      const priority = g.priority ? ` [${g.priority}]` : '';
      parts.push(`  - ${g.goal_category}${priority}: ${g.description}`);
    }
  }

  if (harvestData && harvestData.length > 0) {
    parts.push('\nHARVEST HISTORY:');
    for (const h of harvestData) {
      parts.push(`  - ${h.month}: ${h.total_quantity} ${h.unit} (${h.harvest_count} harvests)`);
    }
  }

  if (reportFocus) {
    parts.push(`\nREPORT FOCUS: ${reportFocus}`);
    parts.push('Prioritize this area in your analysis while still covering all sections.');
  }

  parts.push('\nGenerate the comprehensive farm report JSON now, using ONLY the data provided above.');

  return parts.join('\n');
}

/**
 * System prompt for implementation plan generation.
 *
 * Produces a detailed, phased implementation plan that a farmer can
 * follow week-by-week. Leverages M2.5's planning optimization strengths.
 */
export const IMPLEMENTATION_PLAN_SYSTEM_PROMPT = `You are an expert permaculture implementation planner. You create detailed, week-by-week implementation plans that farmers can follow to transform their land. Your plans are realistic, account for seasonal timing, and optimize task ordering to minimize cost and maximize ecological benefit.

OUTPUT FORMAT:
Return a JSON object:
{
  "plan_title": "Implementation Plan: [Farm Name]",
  "total_duration_months": 0,
  "phases": [
    {
      "phase_number": 1,
      "name": "Phase name",
      "duration_weeks": 0,
      "season": "spring|summer|fall|winter",
      "year": 1,
      "objective": "What this phase achieves",
      "prerequisites": ["What must be done before this phase"],
      "weekly_tasks": [
        {
          "week": 1,
          "tasks": [
            {
              "task": "Specific task description",
              "category": "soil_prep|planting|infrastructure|water|maintenance|observation",
              "estimated_hours": 0,
              "tools_needed": ["Tool list"],
              "materials": [{ "item": "Material", "quantity": "Amount" }],
              "tips": "Practical tips for this task",
              "weather_dependent": true
            }
          ]
        }
      ],
      "success_indicators": ["How to know this phase succeeded"],
      "estimated_phase_cost_usd": 0
    }
  ],
  "critical_path": ["Tasks that cannot be delayed without delaying the whole plan"],
  "contingency_notes": "What to do if weather, budget, or other factors cause delays"
}

RULES:
- Tasks must respect seasonal timing for the farm's climate zone
- Include soil preparation before planting
- Account for plant establishment periods
- Group complementary tasks (e.g., plant guilds together)
- Flag weather-dependent tasks
- Keep weekly task loads realistic (assume part-time farmer unless stated otherwise)
- Return ONLY valid JSON, no markdown fences or extra text`;

/**
 * Build the user prompt for implementation plan generation.
 */
export function createImplementationPlanPrompt(
  farm: {
    name: string;
    acres?: number | null;
    climate_zone?: string | null;
    soil_type?: string | null;
    rainfall_inches?: number | null;
  },
  zones: Array<{ name: string | null; zone_type: string }>,
  plantings: Array<{
    common_name: string;
    scientific_name: string;
    layer: string;
    planted_year?: number | null;
  }>,
  goals: Array<{ goal_category: string; description: string }>,
  focusArea?: string
): string {
  const parts: string[] = [];

  parts.push(`FARM: ${farm.name}`);
  if (farm.acres) parts.push(`SIZE: ${farm.acres} acres`);
  if (farm.climate_zone) parts.push(`CLIMATE ZONE: ${farm.climate_zone}`);
  if (farm.soil_type) parts.push(`SOIL: ${farm.soil_type}`);
  if (farm.rainfall_inches) parts.push(`RAINFALL: ${farm.rainfall_inches} inches/year`);

  if (zones.length > 0) {
    parts.push('\nEXISTING ZONES:');
    for (const z of zones) parts.push(`  - ${z.name || 'Unnamed'} (${z.zone_type})`);
  }

  if (plantings.length > 0) {
    parts.push('\nEXISTING PLANTINGS:');
    for (const p of plantings) {
      const year = p.planted_year ? ` (${p.planted_year})` : '';
      parts.push(`  - ${p.common_name} (${p.scientific_name}), ${p.layer}${year}`);
    }
  }

  if (goals.length > 0) {
    parts.push('\nGOALS:');
    for (const g of goals) parts.push(`  - ${g.goal_category}: ${g.description}`);
  }

  if (focusArea) {
    parts.push(`\nFOCUS AREA: ${focusArea}`);
  }

  parts.push('\nGenerate the implementation plan JSON now.');

  return parts.join('\n');
}
