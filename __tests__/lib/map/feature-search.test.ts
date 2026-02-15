import { searchFeatures } from '@/lib/map/feature-search';

describe('searchFeatures', () => {
  const mockFeatures = {
    zones: [
      { id: 'z1', name: 'Kitchen Garden', zone_type: 'zone_1', user_id: 'u1', farm_id: 'f1', geometry: '{}', style: '{}', created_at: 0, updated_at: 0 },
      { id: 'z2', name: 'Food Forest', zone_type: 'zone_2', user_id: 'u1', farm_id: 'f1', geometry: '{}', style: '{}', created_at: 0, updated_at: 0 }
    ],
    plantings: [
      { id: 'p1', common_name: 'Apple Tree', scientific_name: 'Malus domestica', species_id: 's1', farm_id: 'f1', user_id: 'u1', lat: 0, lng: 0, layer: 'canopy', planted_year: 2024, created_at: 0, updated_at: 0 }
    ],
    lines: [],
    guilds: [],
    phases: []
  };

  it('should find zones by name (case-insensitive)', () => {
    const result = searchFeatures(mockFeatures, 'kitchen');
    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].id).toBe('z1');
  });

  it('should find plantings by common name', () => {
    const result = searchFeatures(mockFeatures, 'apple');
    expect(result.plantings).toHaveLength(1);
    expect(result.plantings[0].id).toBe('p1');
  });

  it('should find plantings by scientific name', () => {
    const result = searchFeatures(mockFeatures, 'malus');
    expect(result.plantings).toHaveLength(1);
  });

  it('should return all features when query is empty', () => {
    const result = searchFeatures(mockFeatures, '');
    expect(result.zones).toHaveLength(2);
    expect(result.plantings).toHaveLength(1);
  });

  it('should return empty arrays when no matches found', () => {
    const result = searchFeatures(mockFeatures, 'xyz123');
    expect(result.zones).toHaveLength(0);
    expect(result.plantings).toHaveLength(0);
  });
});
