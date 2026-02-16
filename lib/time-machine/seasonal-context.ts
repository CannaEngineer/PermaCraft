export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalInfo {
  season: Season;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Get season for a given month
 * Northern hemisphere seasons
 */
export function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

/**
 * Get seasonal information
 */
export function getSeasonalInfo(season: Season): SeasonalInfo {
  const info: Record<Season, SeasonalInfo> = {
    spring: {
      season: 'spring',
      label: 'Spring',
      icon: '🌸',
      color: '#22c55e',
      description: 'Planting season, active growth begins'
    },
    summer: {
      season: 'summer',
      label: 'Summer',
      icon: '☀️',
      color: '#f59e0b',
      description: 'Peak growth, flowering, and fruiting'
    },
    fall: {
      season: 'fall',
      label: 'Fall',
      icon: '🍂',
      color: '#ea580c',
      description: 'Harvest time, plants preparing for dormancy'
    },
    winter: {
      season: 'winter',
      label: 'Winter',
      icon: '❄️',
      color: '#60a5fa',
      description: 'Dormant period, planning for spring'
    }
  };
  return info[season];
}

/**
 * Get seasonal activities for farm planning
 */
export function getSeasonalActivities(season: Season): string[] {
  const activities: Record<Season, string[]> = {
    spring: [
      'Plant bare-root trees',
      'Start annual seeds',
      'Prune dormant trees',
      'Apply mulch'
    ],
    summer: [
      'Harvest fruits and vegetables',
      'Monitor irrigation',
      'Manage pests organically',
      'Take plant cuttings'
    ],
    fall: [
      'Plant garlic and perennials',
      'Harvest tree crops',
      'Collect seeds',
      'Prepare beds for winter'
    ],
    winter: [
      'Plan next year\'s plantings',
      'Prune fruit trees',
      'Build infrastructure',
      'Review and reflect'
    ]
  };
  return activities[season];
}
