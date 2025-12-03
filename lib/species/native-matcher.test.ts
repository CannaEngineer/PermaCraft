import { describe, it, expect } from 'vitest';
import { matchNativeSpecies, isInHardinessRange, includesRegion } from './native-matcher';
import type { Farm } from '@/lib/db/schema';
import type { Species } from '@/lib/db/schema';

describe('isInHardinessRange', () => {
  it('should return true when farm zone is in species range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 6)).toBe(true);
  });

  it('should return false when farm zone is below range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 3)).toBe(false);
  });

  it('should return false when farm zone is above range', () => {
    const species: Partial<Species> = {
      min_hardiness_zone: '4',
      max_hardiness_zone: '8'
    };
    expect(isInHardinessRange(species as Species, 9)).toBe(false);
  });
});

describe('includesRegion', () => {
  it('should return true when region is in species broad_regions', () => {
    expect(includesRegion('["Northeast","Midwest"]', 'Northeast')).toBe(true);
  });

  it('should return false when region is not in species broad_regions', () => {
    expect(includesRegion('["Northeast","Midwest"]', 'Southwest')).toBe(false);
  });

  it('should return false when broad_regions is null', () => {
    expect(includesRegion(null, 'Northeast')).toBe(false);
  });
});

describe('matchNativeSpecies', () => {
  const mockFarm: Farm = {
    id: 'farm-1',
    user_id: 'user-1',
    name: 'Test Farm',
    description: null,
    acres: 5,
    climate_zone: '6',
    rainfall_inches: 40,
    soil_type: null,
    center_lat: 42.3601,
    center_lng: -71.0589,
    zoom_level: 15,
    is_public: 0,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  const mockSpecies: Species[] = [
    {
      id: 'sp-1',
      common_name: 'Perfect Match Plant',
      scientific_name: 'Perfectus matchicus',
      layer: 'canopy',
      is_native: 1,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Northeast"]',
      native_regions: null,
      years_to_maturity: 10,
      mature_height_ft: 50,
      mature_width_ft: 40,
      sun_requirements: 'Full sun',
      water_requirements: 'Medium',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    },
    {
      id: 'sp-2',
      common_name: 'Good Match Plant',
      scientific_name: 'Goodus matchicus',
      layer: 'shrub',
      is_native: 1,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Midwest"]',
      native_regions: null,
      years_to_maturity: 5,
      mature_height_ft: 10,
      mature_width_ft: 8,
      sun_requirements: 'Part shade',
      water_requirements: 'Medium',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    },
    {
      id: 'sp-3',
      common_name: 'Non-Native Possible',
      scientific_name: 'Nonnativus possibilis',
      layer: 'herbaceous',
      is_native: 0,
      min_hardiness_zone: '5',
      max_hardiness_zone: '7',
      broad_regions: '["Northeast"]',
      native_regions: null,
      years_to_maturity: 1,
      mature_height_ft: 3,
      mature_width_ft: 2,
      sun_requirements: 'Full sun',
      water_requirements: 'Low',
      hardiness_zones: null,
      description: 'Test species',
      contributed_by: null,
      created_at: Date.now(),
      permaculture_functions: null,
      companion_plants: null,
      zone_placement_notes: null,
      edible_parts: null,
      sourcing_notes: null,
      min_rainfall_inches: null,
      max_rainfall_inches: null,
      ai_generated: 0
    }
  ];

  it('should categorize species correctly', () => {
    const result = matchNativeSpecies(mockFarm, mockSpecies);

    expect(result.perfect_match).toHaveLength(1);
    expect(result.perfect_match[0].id).toBe('sp-1');

    expect(result.good_match).toHaveLength(1);
    expect(result.good_match[0].id).toBe('sp-2');

    expect(result.possible).toHaveLength(1);
    expect(result.possible[0].id).toBe('sp-3');
  });
});
