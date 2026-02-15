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
}

export interface CompressedContext {
  summary: string;
  keyFacts: string[];
  plantingsList: string;
  nativeSpeciesList: string;
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

  // Summary statistics
  const summary = `Farm: ${zones.length} zones, ${plantings.length} plantings, ${lines.length} water features`;

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

  // Function coverage
  const functionCounts: Record<string, number> = {};
  plantings.forEach(p => {
    if (p.permaculture_functions) {
      try {
        const functions = JSON.parse(p.permaculture_functions);
        functions.forEach((fn: string) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
      } catch {}
    }
  });

  // Highlight gaps (important functions with 0 count)
  const criticalFunctions = ['nitrogen_fixer', 'pollinator_support', 'edible_fruit'];
  criticalFunctions.forEach(fn => {
    if (!functionCounts[fn]) {
      keyFacts.push(`⚠️ No ${fn.replace(/_/g, ' ')}`);
    }
  });

  // Plantings list (compressed)
  let plantingsList: string;
  if (verbosity === 'minimal') {
    // Just species names and counts
    const speciesCounts: Record<string, number> = {};
    plantings.forEach(p => {
      speciesCounts[p.common_name] = (speciesCounts[p.common_name] || 0) + 1;
    });
    plantingsList = Object.entries(speciesCounts)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
  } else if (verbosity === 'detailed') {
    // Full details
    plantingsList = plantings.map(p =>
      `${p.common_name} (${p.scientific_name}): ${p.layer}, planted ${p.planted_year}`
    ).join('\n');
  } else {
    // Standard: key info only
    plantingsList = plantings.map(p =>
      `${p.common_name}: ${p.layer}, year ${p.planted_year || 'unknown'}`
    ).join('\n');
  }

  // Native species (top 10 by relevance)
  const topNatives = nativeSpecies.slice(0, 10);
  const nativeSpeciesList = topNatives.map(s =>
    `${s.common_name} (${s.layer}, ${s.mature_height_ft}ft)`
  ).join(', ');

  // Goals (if any)
  const goalsText = goals.length > 0
    ? goals.map(g => `${g.goal_category}: ${g.description}`).join('; ')
    : 'No goals set';

  // Estimate tokens (rough)
  const text = `${summary}\n${keyFacts.join('\n')}\n${plantingsList}\n${nativeSpeciesList}\n${goalsText}`;
  const tokenEstimate = Math.ceil(text.length / 4); // ~4 chars per token

  return {
    summary,
    keyFacts,
    plantingsList,
    nativeSpeciesList,
    goals: goalsText,
    tokenEstimate
  };
}

/**
 * Build optimized context string for LLM
 */
export function buildOptimizedContext(
  compressed: CompressedContext,
  userQuery: string
): string {
  // Analyze query to determine what context to include
  const needsPlantings = /plant|tree|species|guild/i.test(userQuery);
  const needsNatives = /native|recommend|suggest|add/i.test(userQuery);
  const needsGoals = /goal|objective|plan|timeline/i.test(userQuery);

  const parts: string[] = [compressed.summary];

  if (compressed.keyFacts.length > 0) {
    parts.push('\nKey facts:\n- ' + compressed.keyFacts.join('\n- '));
  }

  if (needsPlantings && compressed.plantingsList) {
    parts.push('\nCurrent plantings:\n' + compressed.plantingsList);
  }

  if (needsNatives && compressed.nativeSpeciesList) {
    parts.push('\nNative species available:\n' + compressed.nativeSpeciesList);
  }

  if (needsGoals && compressed.goals) {
    parts.push('\nFarmer goals: ' + compressed.goals);
  }

  return parts.join('\n\n');
}
