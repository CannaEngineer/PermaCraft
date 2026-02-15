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
  // Search: common name, scientific name, layer
  if (
    planting.common_name?.toLowerCase().includes(query) ||
    planting.scientific_name?.toLowerCase().includes(query) ||
    planting.layer?.toLowerCase().includes(query)
  ) {
    return true;
  }

  // Search permaculture functions (if stored as JSON string)
  if (planting.permaculture_functions) {
    try {
      const functions: string[] = JSON.parse(planting.permaculture_functions);
      return functions.some((fn) => fn.toLowerCase().includes(query));
    } catch {
      // Ignore parse errors
    }
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
