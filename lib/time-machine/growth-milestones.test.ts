import { describe, test, expect } from 'vitest';
import { calculateGrowthMilestones, getMilestoneIcon } from './growth-milestones';

describe('Growth Milestones', () => {
  test('calculates milestones for standard tree', () => {
    const milestones = calculateGrowthMilestones({
      plantedYear: 2024,
      yearsToMaturity: 10,
      speciesName: 'Apple Tree',
      layer: 'canopy'
    });

    expect(milestones).toHaveLength(5);
    expect(milestones[0]).toMatchObject({
      year: 2024,
      type: 'planted',
      label: 'Planted'
    });
    expect(milestones[1]).toMatchObject({
      year: 2026,
      type: 'established',
      label: 'Established'
    });
  });

  test('returns correct icon for milestone type', () => {
    expect(getMilestoneIcon('planted')).toBe('🌱');
    expect(getMilestoneIcon('established')).toBe('🌿');
    expect(getMilestoneIcon('flowering')).toBe('🌸');
    expect(getMilestoneIcon('fruiting')).toBe('🍎');
    expect(getMilestoneIcon('mature')).toBe('🌳');
  });
});
