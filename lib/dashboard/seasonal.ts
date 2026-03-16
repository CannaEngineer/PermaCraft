export type Season = 'early_spring' | 'spring' | 'early_summer' | 'summer' | 'late_summer' | 'autumn' | 'winter';

interface FrostInfo {
  lastFrost: { month: number; day: number };   // spring
  firstFrost: { month: number; day: number };  // autumn
}

// USDA zone -> approximate frost dates (northern hemisphere)
const FROST_DATES: Record<string, FrostInfo> = {
  '3a': { lastFrost: { month: 5, day: 25 }, firstFrost: { month: 9, day: 10 } },
  '3b': { lastFrost: { month: 5, day: 15 }, firstFrost: { month: 9, day: 20 } },
  '4a': { lastFrost: { month: 5, day: 10 }, firstFrost: { month: 9, day: 25 } },
  '4b': { lastFrost: { month: 5, day: 1 },  firstFrost: { month: 10, day: 1 } },
  '5a': { lastFrost: { month: 4, day: 25 }, firstFrost: { month: 10, day: 10 } },
  '5b': { lastFrost: { month: 4, day: 15 }, firstFrost: { month: 10, day: 20 } },
  '6a': { lastFrost: { month: 4, day: 10 }, firstFrost: { month: 10, day: 25 } },
  '6b': { lastFrost: { month: 4, day: 1 },  firstFrost: { month: 11, day: 1 } },
  '7a': { lastFrost: { month: 3, day: 25 }, firstFrost: { month: 11, day: 10 } },
  '7b': { lastFrost: { month: 3, day: 15 }, firstFrost: { month: 11, day: 20 } },
  '8a': { lastFrost: { month: 3, day: 10 }, firstFrost: { month: 11, day: 25 } },
  '8b': { lastFrost: { month: 2, day: 25 }, firstFrost: { month: 12, day: 1 } },
  '9a': { lastFrost: { month: 2, day: 15 }, firstFrost: { month: 12, day: 10 } },
  '9b': { lastFrost: { month: 1, day: 30 }, firstFrost: { month: 12, day: 20 } },
  '10a': { lastFrost: { month: 1, day: 15 }, firstFrost: { month: 12, day: 31 } },
  '10b': { lastFrost: { month: 1, day: 1 },  firstFrost: { month: 12, day: 31 } },
};

export interface SeasonalContext {
  season: Season;
  seasonLabel: string;
  daysToLastFrost: number | null;   // positive = frost in future, negative = past
  daysToFirstFrost: number | null;
  frostRisk: boolean;               // within 2 days of frost
  hemisphere: 'north' | 'south';
}

function normalizeClimateZone(raw: string): string {
  return raw
    .replace(/usda\s*zone\s*/i, '')
    .replace(/zone\s*/i, '')
    .replace(/usda\s*/i, '')
    .trim()
    .toLowerCase();
}

export function getSeasonalContext(
  climateZone: string | null,
  centerLat: number | null,
  now = new Date()
): SeasonalContext {
  const hemisphere: 'north' | 'south' = (centerLat ?? 40) >= 0 ? 'north' : 'south';
  const month = now.getMonth() + 1; // 1-12

  const season = getSeason(month, hemisphere);
  const seasonLabel = getSeasonLabel(season, now);

  const zoneKey = climateZone ? normalizeClimateZone(climateZone) : null;
  const frostInfo = zoneKey && /^\d{1,2}[ab]$/.test(zoneKey) ? FROST_DATES[zoneKey] ?? null : null;

  let daysToLastFrost: number | null = null;
  let daysToFirstFrost: number | null = null;

  if (frostInfo && hemisphere === 'north') {
    const lastFrostDate = new Date(now.getFullYear(), frostInfo.lastFrost.month - 1, frostInfo.lastFrost.day);
    const firstFrostDate = new Date(now.getFullYear(), frostInfo.firstFrost.month - 1, frostInfo.firstFrost.day);
    daysToLastFrost = Math.round((lastFrostDate.getTime() - now.getTime()) / 86400000);
    daysToFirstFrost = Math.round((firstFrostDate.getTime() - now.getTime()) / 86400000);
  }

  const frostRisk = (daysToLastFrost !== null && Math.abs(daysToLastFrost) <= 2)
    || (daysToFirstFrost !== null && Math.abs(daysToFirstFrost) <= 2);

  return { season, seasonLabel, daysToLastFrost, daysToFirstFrost, frostRisk, hemisphere };
}

function getSeason(month: number, hemisphere: 'north' | 'south'): Season {
  const m = hemisphere === 'north' ? month : ((month + 5) % 12) + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m === 3) return 'early_spring';
  if (m === 4) return 'spring';
  if (m === 5) return 'early_summer';
  if (m === 6 || m === 7) return 'summer';
  if (m === 8) return 'late_summer';
  return 'autumn';
}

function getSeasonLabel(season: Season, now: Date): string {
  const year = now.getFullYear();
  const labels: Record<Season, string> = {
    early_spring: `Early Spring ${year}`,
    spring: `Spring ${year}`,
    early_summer: `Early Summer ${year}`,
    summer: `Summer ${year}`,
    late_summer: `Late Summer ${year}`,
    autumn: `Autumn ${year}`,
    winter: `Winter ${year}`,
  };
  return labels[season];
}
