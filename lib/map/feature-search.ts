export interface AllFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

export interface FilteredFeatures {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
}

const parsedFunctionsCache = new WeakMap<any, string[] | null>();

export function getParsedFunctions(planting: any): string[] | null {
  if (parsedFunctionsCache.has(planting)) return parsedFunctionsCache.get(planting)!;
  let result: string[] | null = null;
  if (planting.permaculture_functions) {
    try {
      result = JSON.parse(planting.permaculture_functions);
    } catch {
      // ignore
    }
  }
  parsedFunctionsCache.set(planting, result);
  return result;
}

/**
 * Search features across multiple fields (case-insensitive substring matching)
 */
export function searchFeatures(features: AllFeatures, query: string): FilteredFeatures {
  const normalizedQuery = query.toLowerCase().trim();

  // Empty query returns all features
  if (!normalizedQuery) {
    return features;
  }

  return {
    zones: features.zones.filter((zone) =>
      matchesZone(zone, normalizedQuery)
    ),
    plantings: features.plantings.filter((planting) =>
      matchesPlanting(planting, normalizedQuery)
    ),
    lines: features.lines.filter((line) =>
      matchesLine(line, normalizedQuery)
    ),
    guilds: features.guilds.filter((guild) =>
      matchesGuild(guild, normalizedQuery)
    ),
    phases: features.phases.filter((phase) =>
      matchesPhase(phase, normalizedQuery)
    ),
  };
}

function matchesZone(zone: any, query: string): boolean {
  return (
    zone.name?.toLowerCase().includes(query) ||
    zone.zone_type?.toLowerCase().includes(query)
  );
}

function matchesPlanting(planting: any, query: string): boolean {
  if (
    planting.common_name?.toLowerCase().includes(query) ||
    planting.scientific_name?.toLowerCase().includes(query) ||
    planting.layer?.toLowerCase().includes(query)
  ) {
    return true;
  }

  const functions = getParsedFunctions(planting);
  if (functions) {
    return functions.some((fn) => fn.toLowerCase().includes(query));
  }

  return false;
}

function matchesLine(line: any, query: string): boolean {
  return (
    line.label?.toLowerCase().includes(query) ||
    line.line_type?.toLowerCase().includes(query)
  );
}

function matchesGuild(guild: any, query: string): boolean {
  return guild.name?.toLowerCase().includes(query);
}

function matchesPhase(phase: any, query: string): boolean {
  return (
    phase.name?.toLowerCase().includes(query) ||
    phase.description?.toLowerCase().includes(query)
  );
}
