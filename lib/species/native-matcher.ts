import type { Farm, Species } from '@/lib/db/schema';
import { getFarmRegion } from './region-mapper';

export interface MatchedSpecies {
  perfect_match: Species[];
  good_match: Species[];
  possible: Species[];
}

/**
 * Check if farm's hardiness zone falls within species' range
 */
export function isInHardinessRange(species: Species, farmZone: number): boolean {
  const min = parseInt(species.min_hardiness_zone || '0');
  const max = parseInt(species.max_hardiness_zone || '13');
  return farmZone >= min && farmZone <= max;
}

/**
 * Check if farm's region is in species' broad_regions array
 */
export function includesRegion(speciesRegions: string | null, farmRegion: string): boolean {
  if (!speciesRegions) return false;
  try {
    const regions = JSON.parse(speciesRegions);
    return Array.isArray(regions) && regions.includes(farmRegion);
  } catch {
    return false;
  }
}

/**
 * Match species to farm based on native status, hardiness, and region
 * Returns categorized lists: perfect_match, good_match, possible
 */
export function matchNativeSpecies(farm: Farm, allSpecies: Species[]): MatchedSpecies {
  const farmZone = parseInt(farm.climate_zone || '0');
  const farmRegion = getFarmRegion(farm.center_lat, farm.center_lng);

  const perfect_match: Species[] = [];
  const good_match: Species[] = [];
  const possible: Species[] = [];

  for (const species of allSpecies) {
    const inZone = isInHardinessRange(species, farmZone);
    const inRegion = includesRegion(species.broad_regions, farmRegion);

    if (species.is_native === 1) {
      if (inZone && inRegion) {
        perfect_match.push(species);
      } else if (inZone || inRegion) {
        good_match.push(species);
      }
    } else if (inZone) {
      possible.push(species);
    }
  }

  return { perfect_match, good_match, possible };
}
