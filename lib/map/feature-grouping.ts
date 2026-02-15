import { AllFeatures } from './feature-search';

export interface GroupedFeatures {
  [groupName: string]: any[];
}

export function groupByType(features: AllFeatures): GroupedFeatures {
  return {
    'Zones': [...features.zones].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    'Plantings': [...features.plantings].sort((a, b) => (a.common_name || '').localeCompare(b.common_name || '')),
    'Lines': [...features.lines].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    'Guilds': [...features.guilds].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    'Phases': [...features.phases].sort((a, b) => (a.start_year || 0) - (b.start_year || 0))
  };
}

export function groupByLayer(features: AllFeatures): GroupedFeatures {
  const groups: GroupedFeatures = {
    'Canopy': [],
    'Understory': [],
    'Shrub': [],
    'Herbaceous': [],
    'Groundcover': [],
    'Vine': [],
    'Root': [],
    'Unassigned': [],
    'Other Features': []
  };

  // Group plantings by layer
  features.plantings.forEach((planting) => {
    const layer = planting.layer;
    if (layer) {
      const groupName = layer.charAt(0).toUpperCase() + layer.slice(1);
      if (groups[groupName]) {
        groups[groupName].push(planting);
      } else {
        groups['Unassigned'].push(planting);
      }
    } else {
      groups['Unassigned'].push(planting);
    }
  });

  // Put other features in "Other Features"
  groups['Other Features'] = [
    ...features.zones,
    ...features.lines,
    ...features.guilds,
    ...features.phases
  ];

  // Remove empty groups
  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

export function groupByPhase(features: AllFeatures, phases: any[]): GroupedFeatures {
  const groups: GroupedFeatures = {};

  // Create group for each phase
  phases.forEach((phase) => {
    groups[phase.name] = [];
  });

  // Add "Unscheduled" group
  groups['Unscheduled'] = [];

  // Helper to find phase for a year
  const findPhaseForYear = (year: number | null | undefined) => {
    if (!year) return null;
    return phases.find(
      (phase) => year >= (phase.start_year || 0) && year <= (phase.end_year || 9999)
    );
  };

  // Group plantings by planted_year
  features.plantings.forEach((planting) => {
    const phase = findPhaseForYear(planting.planted_year);
    if (phase) {
      groups[phase.name].push(planting);
    } else {
      groups['Unscheduled'].push(planting);
    }
  });

  // Add zones, lines, guilds to Unscheduled for now (can enhance later with phase_id)
  groups['Unscheduled'].push(...features.zones, ...features.lines, ...features.guilds);

  return groups;
}
