export interface GrowthMilestone {
  year: number;
  type: 'planted' | 'established' | 'flowering' | 'fruiting' | 'mature';
  label: string;
  description: string;
  sizeFraction: number; // 0-1, how much of mature size
}

export interface PlantingInfo {
  plantedYear: number;
  yearsToMaturity: number;
  speciesName: string;
  layer?: string;
}

/**
 * Calculate key growth milestones for a planting
 */
export function calculateGrowthMilestones(planting: PlantingInfo): GrowthMilestone[] {
  const { plantedYear, yearsToMaturity, layer } = planting;
  const milestones: GrowthMilestone[] = [];

  // Planted
  milestones.push({
    year: plantedYear,
    type: 'planted',
    label: 'Planted',
    description: 'Seedling or transplant',
    sizeFraction: 0.05
  });

  // Established (Year 2 or 20% of maturity)
  const establishedYear = plantedYear + Math.max(1, Math.floor(yearsToMaturity * 0.2));
  milestones.push({
    year: establishedYear,
    type: 'established',
    label: 'Established',
    description: 'Root system developed, active growth',
    sizeFraction: 0.3
  });

  // Flowering/Fruiting (trees/shrubs at 30% maturity, herbs earlier)
  if (layer === 'canopy' || layer === 'understory' || layer === 'shrub') {
    const floweringYear = plantedYear + Math.floor(yearsToMaturity * 0.3);
    milestones.push({
      year: floweringYear,
      type: 'flowering',
      label: 'First Flowers',
      description: 'Beginning to flower and potentially fruit',
      sizeFraction: 0.5
    });

    const fruitingYear = plantedYear + Math.floor(yearsToMaturity * 0.5);
    milestones.push({
      year: fruitingYear,
      type: 'fruiting',
      label: 'Full Production',
      description: 'Reliable fruit/nut production',
      sizeFraction: 0.75
    });
  }

  // Mature
  milestones.push({
    year: plantedYear + yearsToMaturity,
    type: 'mature',
    label: 'Mature',
    description: 'Full size and productivity',
    sizeFraction: 1.0
  });

  return milestones;
}

/**
 * Get emoji icon for milestone type
 */
export function getMilestoneIcon(type: GrowthMilestone['type']): string {
  const icons = {
    planted: '🌱',
    established: '🌿',
    flowering: '🌸',
    fruiting: '🍎',
    mature: '🌳'
  };
  return icons[type] || '🌱';
}

/**
 * Get color for milestone type
 */
export function getMilestoneColor(type: GrowthMilestone['type']): string {
  const colors = {
    planted: '#22c55e',
    established: '#16a34a',
    flowering: '#ec4899',
    fruiting: '#f59e0b',
    mature: '#166534'
  };
  return colors[type] || '#22c55e';
}
