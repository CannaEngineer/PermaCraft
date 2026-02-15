import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';

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

  describe('groupByLayer', () => {
    it('should group plantings by layer', () => {
      const result = groupByLayer(mockFeatures);
      expect(result).toHaveProperty('Canopy');
      expect(result).toHaveProperty('Herbaceous');
      expect(result.Canopy).toHaveLength(1);
      expect(result.Herbaceous).toHaveLength(1);
    });

    it('should put non-plantings in Other Features group', () => {
      const result = groupByLayer(mockFeatures);
      expect(result).toHaveProperty('Other Features');
      expect(result['Other Features'].length).toBeGreaterThan(0);
    });
  });

  describe('groupByPhase', () => {
    const mockPhases = [
      { id: 'ph1', name: 'Year 1', start_year: 2024, end_year: 2024 },
      { id: 'ph2', name: 'Year 2-3', start_year: 2025, end_year: 2026 }
    ];

    const featuresWithPhases = {
      ...mockFeatures,
      plantings: [
        { id: 'p1', common_name: 'Apple', planted_year: 2024 },
        { id: 'p2', common_name: 'Pear', planted_year: 2025 }
      ]
    };

    it('should group features by phase', () => {
      const result = groupByPhase(featuresWithPhases, mockPhases);
      expect(result).toHaveProperty('Year 1');
      expect(result).toHaveProperty('Year 2-3');
    });

    it('should put unscheduled features in Unscheduled group', () => {
      const result = groupByPhase(mockFeatures, mockPhases);
      expect(result).toHaveProperty('Unscheduled');
    });
  });
});
