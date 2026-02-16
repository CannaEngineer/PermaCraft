/**
 * Tests for Smart Context Compressor
 */

import { compressFarmContext, buildOptimizedContext, FarmContext } from './context-compressor';

describe('compressFarmContext', () => {
  const mockContext: FarmContext = {
    zones: [
      { id: '1', name: 'Zone 1' },
      { id: '2', name: 'Zone 2' }
    ],
    plantings: [
      {
        id: '1',
        common_name: 'Apple',
        scientific_name: 'Malus domestica',
        layer: 'canopy',
        planted_year: 2020,
        permaculture_functions: JSON.stringify(['edible_fruit', 'pollinator_support'])
      },
      {
        id: '2',
        common_name: 'Comfrey',
        scientific_name: 'Symphytum officinale',
        layer: 'herbaceous',
        planted_year: 2021,
        permaculture_functions: JSON.stringify(['nitrogen_fixer', 'dynamic_accumulator'])
      },
      {
        id: '3',
        common_name: 'Apple',
        scientific_name: 'Malus domestica',
        layer: 'canopy',
        planted_year: 2020,
        permaculture_functions: JSON.stringify(['edible_fruit', 'pollinator_support'])
      }
    ],
    lines: [
      { id: '1', line_type: 'swale' }
    ],
    goals: [
      { goal_category: 'Food Production', description: 'Produce 50% of household food' }
    ],
    nativeSpecies: [
      { common_name: 'Oak', layer: 'canopy', mature_height_ft: 80 },
      { common_name: 'Serviceberry', layer: 'understory', mature_height_ft: 20 }
    ]
  };

  test('generates summary statistics', () => {
    const result = compressFarmContext(mockContext, 'standard');
    expect(result.summary).toBe('Farm: 2 zones, 3 plantings, 1 water features');
  });

  test('counts plantings by layer', () => {
    const result = compressFarmContext(mockContext, 'standard');
    expect(result.keyFacts).toContain('2 canopy layer plants');
    expect(result.keyFacts).toContain('1 herbaceous layer plants');
  });

  test('detects missing critical functions', () => {
    const contextWithoutPollinators: FarmContext = {
      ...mockContext,
      plantings: [
        {
          id: '1',
          common_name: 'Oak',
          scientific_name: 'Quercus',
          layer: 'canopy',
          planted_year: 2020,
          permaculture_functions: JSON.stringify(['nitrogen_fixer'])
        }
      ]
    };

    const result = compressFarmContext(contextWithoutPollinators, 'standard');
    expect(result.keyFacts).toContain('⚠️ No pollinator support');
    expect(result.keyFacts).toContain('⚠️ No edible fruit');
  });

  test('minimal verbosity returns species counts', () => {
    const result = compressFarmContext(mockContext, 'minimal');
    expect(result.plantingsList).toContain('Apple (2)');
    expect(result.plantingsList).toContain('Comfrey (1)');
  });

  test('standard verbosity returns layer and year', () => {
    const result = compressFarmContext(mockContext, 'standard');
    expect(result.plantingsList).toContain('Apple: canopy, year 2020');
    expect(result.plantingsList).toContain('Comfrey: herbaceous, year 2021');
  });

  test('detailed verbosity returns full details', () => {
    const result = compressFarmContext(mockContext, 'detailed');
    expect(result.plantingsList).toContain('Apple (Malus domestica): canopy, planted 2020');
    expect(result.plantingsList).toContain('Comfrey (Symphytum officinale): herbaceous, planted 2021');
  });

  test('limits native species to top 10', () => {
    const contextWithManyNatives: FarmContext = {
      ...mockContext,
      nativeSpecies: Array.from({ length: 20 }, (_, i) => ({
        common_name: `Species${i}`,
        layer: 'canopy',
        mature_height_ft: 50
      }))
    };

    const result = compressFarmContext(contextWithManyNatives, 'standard');
    // Each species is formatted as "Name (layer, height)" joined by ", "
    // Count species by looking for the pattern "Species" followed by a number
    const speciesMatches = result.nativeSpeciesList.match(/Species\d+/g);
    expect(speciesMatches?.length).toBe(10);
  });

  test('formats goals correctly', () => {
    const result = compressFarmContext(mockContext, 'standard');
    expect(result.goals).toBe('Food Production: Produce 50% of household food');
  });

  test('handles no goals', () => {
    const contextWithoutGoals: FarmContext = {
      ...mockContext,
      goals: []
    };

    const result = compressFarmContext(contextWithoutGoals, 'standard');
    expect(result.goals).toBe('No goals set');
  });

  test('estimates token count', () => {
    const result = compressFarmContext(mockContext, 'standard');
    expect(result.tokenEstimate).toBeGreaterThan(0);
    // Rough check: should be less than 2000 tokens for this small context
    expect(result.tokenEstimate).toBeLessThan(2000);
  });
});

describe('buildOptimizedContext', () => {
  const compressed = {
    summary: 'Farm: 2 zones, 3 plantings, 1 water features',
    keyFacts: ['2 canopy layer plants', '1 herbaceous layer plants'],
    plantingsList: 'Apple: canopy, year 2020\nComfrey: herbaceous, year 2021',
    nativeSpeciesList: 'Oak (canopy, 80ft), Serviceberry (understory, 20ft)',
    goals: 'Food Production: Produce 50% of household food',
    tokenEstimate: 150
  };

  test('includes plantings for plant-related query', () => {
    const result = buildOptimizedContext(compressed, 'What fruit trees should I plant?');
    expect(result).toContain('Current plantings:');
    expect(result).toContain('Apple: canopy');
  });

  test('includes natives for recommendation query', () => {
    const result = buildOptimizedContext(compressed, 'Suggest some native species');
    expect(result).toContain('Native species available:');
    expect(result).toContain('Oak (canopy, 80ft)');
  });

  test('includes goals for planning query', () => {
    const result = buildOptimizedContext(compressed, 'Help me plan my timeline');
    expect(result).toContain('Farmer goals:');
    expect(result).toContain('Food Production');
  });

  test('excludes irrelevant sections', () => {
    const result = buildOptimizedContext(compressed, 'What is the weather like?');
    expect(result).not.toContain('Current plantings:');
    expect(result).not.toContain('Native species available:');
    expect(result).not.toContain('Farmer goals:');
  });

  test('always includes summary and key facts', () => {
    const result = buildOptimizedContext(compressed, 'random query');
    expect(result).toContain('Farm: 2 zones, 3 plantings, 1 water features');
    expect(result).toContain('Key facts:');
    expect(result).toContain('2 canopy layer plants');
  });

  test('handles multiple query triggers', () => {
    const result = buildOptimizedContext(compressed, 'What native trees should I plant to achieve my goals?');
    expect(result).toContain('Current plantings:');
    expect(result).toContain('Native species available:');
    expect(result).toContain('Farmer goals:');
  });
});
