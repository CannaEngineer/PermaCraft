/**
 * Smart Context Compressor
 *
 * Compresses farm context data from potentially thousands of tokens down to < 2000 tokens
 * while preserving the most relevant information for AI analysis.
 *
 * Features:
 * - Three verbosity levels (minimal, standard, detailed)
 * - Query-aware context building - only includes relevant sections
 * - Gap detection - highlights missing critical functions
 * - Token estimation for cost tracking
 * - Smart summarization - layer counts, function coverage, top natives
 */

export interface FarmContext {
  zones: any[];
  plantings: any[];
  lines: any[];
  goals: any[];
  nativeSpecies: any[];
  guilds?: any[];
  phases?: any[];
  zonesWithGrid?: Array<{
    name: string;
    zone_type: string;
    gridCoordinates?: string;
    areaAcres?: number;
  }>;
}

export interface CompressedContext {
  summary: string;
  keyFacts: string[];
  plantingsList: string;
  linesList: string;
  nativeSpeciesList: string;
  guildsList: string;
  phasesList: string;
  goals: string;
  tokenEstimate: number;
}

/**
 * Compress farm context to essential information
 * Target: < 2000 tokens for context
 */
export function compressFarmContext(
  context: FarmContext,
  verbosity: 'minimal' | 'standard' | 'detailed' = 'standard'
): CompressedContext {
  const { zones, plantings, lines, goals, nativeSpecies } = context;

  // Categorize lines by type for meaningful summary
  const lineTypeCounts: Record<string, number> = {};
  lines.forEach(l => {
    const t = l.line_type || 'other';
    lineTypeCounts[t] = (lineTypeCounts[t] || 0) + 1;
  });
  const linesSummary = lines.length > 0
    ? Object.entries(lineTypeCounts).map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`).join(', ')
    : 'no line features';

  // Build zone details with spatial data when available
  const zonesWithGrid = context.zonesWithGrid;
  let zoneDetails = '';
  if (zonesWithGrid && zonesWithGrid.length > 0) {
    zoneDetails = '\nZones:\n' + zonesWithGrid.map(z => {
      const gridRef = z.gridCoordinates ? ` at grid ${z.gridCoordinates}` : '';
      const areaRef = z.areaAcres ? `, ~${z.areaAcres} acres` : '';
      return `  - ${z.name || 'Unnamed'} (${z.zone_type})${gridRef}${areaRef}`;
    }).join('\n');
  }

  // Summary statistics
  const summary = `Farm: ${zones.length} zones, ${plantings.length} plantings, ${linesSummary}${zoneDetails}`;

  // Key facts (most important info first)
  const keyFacts: string[] = [];

  // Count by layer
  const layerCounts: Record<string, number> = {};
  plantings.forEach(p => {
    layerCounts[p.layer] = (layerCounts[p.layer] || 0) + 1;
  });

  Object.entries(layerCounts).forEach(([layer, count]) => {
    keyFacts.push(`${count} ${layer} layer plants`);
  });

  // Native vs non-native balance
  let nativeCount = 0;
  let nonNativeCount = 0;
  plantings.forEach(p => {
    if (p.is_native) nativeCount++;
    else nonNativeCount++;
  });
  if (plantings.length > 0) {
    keyFacts.push(`${nativeCount} native, ${nonNativeCount} non-native plantings`);
  }

  // Function coverage
  const functionCounts: Record<string, number> = {};
  plantings.forEach(p => {
    if (p.permaculture_functions) {
      try {
        const fns = typeof p.permaculture_functions === 'string'
          ? JSON.parse(p.permaculture_functions)
          : p.permaculture_functions;
        if (Array.isArray(fns)) {
          fns.forEach((fn: string) => {
            functionCounts[fn] = (functionCounts[fn] || 0) + 1;
          });
        }
      } catch {}
    }
  });

  const criticalFunctions = [
    'nitrogen_fixer', 'pollinator_support', 'edible_fruit',
    'dynamic_accumulator', 'ground_cover', 'windbreak',
    'pest_confuser', 'wildlife_habitat',
  ];

  // Report present functions with counts so AI can assess ecological balance
  const presentFunctions: string[] = [];
  const missingFunctions: string[] = [];
  criticalFunctions.forEach(fn => {
    if (functionCounts[fn]) {
      presentFunctions.push(`${functionCounts[fn]} ${fn.replace(/_/g, ' ')}`);
    } else {
      missingFunctions.push(fn.replace(/_/g, ' '));
    }
  });
  if (presentFunctions.length > 0) {
    keyFacts.push(`Functions present: ${presentFunctions.join(', ')}`);
  }
  missingFunctions.forEach(fn => {
    keyFacts.push(`⚠️ No ${fn}`);
  });

  // Plantings list (compressed) — always includes native status per core principle
  let plantingsList: string;
  if (verbosity === 'minimal') {
    const speciesCounts: Record<string, { count: number; native: boolean }> = {};
    plantings.forEach(p => {
      const key = p.common_name;
      if (!speciesCounts[key]) speciesCounts[key] = { count: 0, native: !!p.is_native };
      speciesCounts[key].count++;
    });
    plantingsList = Object.entries(speciesCounts)
      .map(([name, info]) => `${name} (${info.count}) ${info.native ? '[N]' : '[NN]'}`)
      .join(', ');
  } else if (verbosity === 'detailed') {
    plantingsList = plantings.map(p => {
      const native = p.is_native ? '[NATIVE]' : '[NON-NATIVE]';
      return `${p.common_name} (${p.scientific_name}) ${native}: ${p.layer}, planted ${p.planted_year}`;
    }).join('\n');
  } else {
    plantingsList = plantings.map(p => {
      const native = p.is_native ? '[N]' : '[NN]';
      return `${p.common_name} ${native}: ${p.layer}, year ${p.planted_year || 'unknown'}`;
    }).join('\n');
  }

  // Lines/water features context
  let linesList: string;
  if (lines.length === 0) {
    linesList = '';
  } else if (verbosity === 'minimal') {
    linesList = Object.entries(lineTypeCounts)
      .map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`)
      .join(', ');
  } else {
    linesList = lines.map(l => {
      const label = l.label ? `"${l.label}"` : 'unlabeled';
      let waterInfo = '';
      if (l.water_properties) {
        try {
          const wp = typeof l.water_properties === 'string' ? JSON.parse(l.water_properties) : l.water_properties;
          const details: string[] = [];
          if (wp.flow_type) details.push(wp.flow_type);
          if (wp.flow_rate_estimate) details.push(wp.flow_rate_estimate);
          if (details.length > 0) waterInfo = ` (${details.join(', ')})`;
        } catch {}
      }
      return `${l.line_type}: ${label}${waterInfo}`;
    }).join('\n');
  }

  // Water infrastructure summary from zones (swales, catchments)
  const waterZones = zones.filter(z =>
    z.swale_properties || z.catchment_properties ||
    ['swale', 'pond', 'water_body', 'water_flow'].includes(z.zone_type)
  );
  if (waterZones.length > 0) {
    const waterParts: string[] = [];
    for (const z of waterZones) {
      const parts: string[] = [z.name || z.zone_type];
      if (z.swale_properties) {
        try {
          const sp = typeof z.swale_properties === 'string' ? JSON.parse(z.swale_properties) : z.swale_properties;
          if (sp.length_feet) parts.push(`${sp.length_feet}ft long`);
          if (sp.estimated_volume_gallons) parts.push(`~${sp.estimated_volume_gallons} gal capacity`);
        } catch {}
      }
      if (z.catchment_properties) {
        try {
          const cp = typeof z.catchment_properties === 'string' ? JSON.parse(z.catchment_properties) : z.catchment_properties;
          if (cp.estimated_capture_gallons) parts.push(`captures ~${cp.estimated_capture_gallons} gal/yr`);
        } catch {}
      }
      waterParts.push(parts.join(', '));
    }
    if (linesList) {
      linesList += '\nWater infrastructure:\n' + waterParts.map(w => `  - ${w}`).join('\n');
    } else {
      linesList = 'Water infrastructure:\n' + waterParts.map(w => `  - ${w}`).join('\n');
    }
  }

  // Native species (top 10 by relevance)
  const topNatives = nativeSpecies.slice(0, 10);
  const nativeSpeciesList = topNatives.map(s =>
    `${s.common_name} (${s.layer}, ${s.mature_height_ft}ft)`
  ).join(', ');

  // Guilds (companion planting groups)
  const guilds = context.guilds || [];
  let guildsList: string;
  if (guilds.length === 0) {
    guildsList = '';
  } else if (verbosity === 'minimal') {
    guildsList = `${guilds.length} guild${guilds.length > 1 ? 's' : ''} designed`;
  } else {
    guildsList = guilds.map(g => {
      const focal = g.focal_common_name || g.focal_species || 'unknown focal';
      let companions = '';
      if (g.companion_species) {
        try {
          const parsed = typeof g.companion_species === 'string' ? JSON.parse(g.companion_species) : g.companion_species;
          if (Array.isArray(parsed)) {
            companions = parsed.map((c: any) => c.common_name || c.name || 'unknown').join(', ');
          }
        } catch {}
      }
      return `"${g.name || 'Unnamed'}": focal=${focal}${companions ? `, companions: ${companions}` : ''}`;
    }).join('\n');
  }

  // Phases (implementation timeline)
  const phases = context.phases || [];
  let phasesList: string;
  if (phases.length === 0) {
    phasesList = '';
  } else if (verbosity === 'minimal') {
    phasesList = `${phases.length} implementation phase${phases.length > 1 ? 's' : ''} defined`;
  } else {
    phasesList = phases.map(p => {
      const dates = p.start_date && p.end_date ? ` (${p.start_date} → ${p.end_date})` : '';
      return `"${p.name || 'Unnamed'}"${dates}${p.description ? `: ${p.description}` : ''}`;
    }).join('\n');
  }

  // Goals (if any)
  const goalsText = goals.length > 0
    ? goals.map(g => `${g.goal_category}: ${g.description}`).join('; ')
    : 'No goals set';

  // Estimate tokens (rough)
  const text = `${summary}\n${keyFacts.join('\n')}\n${plantingsList}\n${linesList}\n${nativeSpeciesList}\n${guildsList}\n${phasesList}\n${goalsText}`;
  const tokenEstimate = Math.ceil(text.length / 4); // ~4 chars per token

  return {
    summary,
    keyFacts,
    plantingsList,
    linesList,
    nativeSpeciesList,
    guildsList,
    phasesList,
    goals: goalsText,
    tokenEstimate
  };
}

/**
 * Build optimized context string for LLM
 *
 * Always includes summary and key facts. Conditionally includes detailed
 * sections based on keyword matching against the user's query.
 * For general/broad questions that don't match specific patterns, includes
 * ALL context so the AI can give site-specific answers.
 */
export function buildOptimizedContext(
  compressed: CompressedContext,
  userQuery: string
): string {
  const needsPlantings = /plant|tree|species|grow|harvest|food|fruit|crop|layer|canopy|understory|shrub|herb|garden|orchard|forest|mulch|prune|spacing|diversity/i.test(userQuery);
  const needsGuilds = /guild|companion|polyculture|synergy|support.*species|nitrogen.*fix|accumulator|together|pair|combination/i.test(userQuery);
  const needsLines = /water|swale|drain|flow|fence|hedge|contour|erosion|runoff|irrigation|catchment|terrace|path|access|corridor|slope/i.test(userQuery);
  const needsNatives = /native|recommend|suggest|add|what.*should|improve|best|suitable|appropriate|good.*for|zone\s?\d|hardiness|climate/i.test(userQuery);
  const needsGoals = /goal|objective|priority|budget|strategy|vision|purpose|focus/i.test(userQuery);
  const needsPhases = /phase|timeline|plan|schedule|year|when.*start|implementation|sequence|order|season|spring|summer|fall|winter|autumn/i.test(userQuery);

  // If the query doesn't match any specific pattern, it's a general/broad question —
  // include all context so the AI has full farm awareness
  const isGeneralQuery = !needsPlantings && !needsGuilds && !needsLines && !needsNatives && !needsGoals && !needsPhases;

  const parts: string[] = [compressed.summary];

  if (compressed.keyFacts.length > 0) {
    parts.push('Key facts:\n- ' + compressed.keyFacts.join('\n- '));
  }

  if ((needsPlantings || needsGuilds || isGeneralQuery) && compressed.plantingsList) {
    parts.push('Current plantings:\n' + compressed.plantingsList);
  }

  if ((needsLines || isGeneralQuery) && compressed.linesList) {
    parts.push('Lines & water features:\n' + compressed.linesList);
  }

  if ((needsNatives || isGeneralQuery) && compressed.nativeSpeciesList) {
    parts.push('Native species available:\n' + compressed.nativeSpeciesList);
  }

  if ((needsGoals || isGeneralQuery) && compressed.goals !== 'No goals set') {
    parts.push('Farmer goals: ' + compressed.goals);
  }

  if ((needsGuilds || needsPlantings || isGeneralQuery) && compressed.guildsList) {
    parts.push('Plant guilds:\n' + compressed.guildsList);
  }

  if ((needsPhases || needsGoals || isGeneralQuery) && compressed.phasesList) {
    parts.push('Implementation phases:\n' + compressed.phasesList);
  }

  return parts.join('\n\n');
}
