import { groupByType } from '@/lib/map/feature-grouping';

describe('feature-grouping', () => {
  const mockFeatures = {
    zones: [
      { id: 'z1', name: 'Kitchen Garden', zone_type: 'zone_1' },
      { id: 'z2', name: 'Food Forest', zone_type: 'zone_2' }
    ],
    plantings: [
      { id: 'p1', common_name: 'Apple Tree', scientific_name: 'Malus domestica', layer: 'canopy' },
      { id: 'p2', common_name: 'Comfrey', scientific_name: 'Symphytum officinale', layer: 'herbaceous' }
    ],
    lines: [{ id: 'l1', label: 'Swale #1', line_type: 'swale' }],
    guilds: [{ id: 'g1', name: 'Apple Guild' }],
    phases: [{ id: 'ph1', name: 'Year 1', start_year: 2024 }]
  };

  describe('groupByType', () => {
    it('should group features by type', () => {
      const result = groupByType(mockFeatures);
      expect(result).toHaveProperty('Zones');
      expect(result).toHaveProperty('Plantings');
      expect(result).toHaveProperty('Lines');
      expect(result).toHaveProperty('Guilds');
      expect(result).toHaveProperty('Phases');
      expect(result.Zones).toHaveLength(2);
      expect(result.Plantings).toHaveLength(2);
    });

    it('should sort zones alphabetically by name', () => {
      const result = groupByType(mockFeatures);
      expect(result.Zones[0].name).toBe('Food Forest');
      expect(result.Zones[1].name).toBe('Kitchen Garden');
    });

    it('should handle empty feature arrays', () => {
      const emptyFeatures = { zones: [], plantings: [], lines: [], guilds: [], phases: [] };
      const result = groupByType(emptyFeatures);
      expect(result.Zones).toHaveLength(0);
    });
  });
});
