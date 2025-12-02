export type Region =
  | 'Northeast'
  | 'Mid_Atlantic'
  | 'Southeast'
  | 'Midwest'
  | 'South'
  | 'West'
  | 'Southwest'
  | 'Pacific_Northwest';

/**
 * Map farm coordinates to broad US region
 * Simple lat/lng-based approximation
 */
export function getFarmRegion(lat: number, lng: number): Region {
  // West of -100° longitude = Western regions
  if (lng < -100) {
    if (lat > 42) return 'Pacific_Northwest';
    if (lat > 35) return 'West';
    return 'Southwest';
  }

  // Between -100° and -85° = Central regions (Midwest/South)
  if (lng < -85) {
    if (lat > 40) return 'Midwest';
    return 'South';
  }

  // East of -85° = Eastern regions
  if (lat > 40) return 'Northeast';
  if (lat > 36) return 'Mid_Atlantic';
  return 'Southeast';
}

/**
 * Get human-readable region name
 */
export function getRegionName(region: Region): string {
  const names: Record<Region, string> = {
    'Northeast': 'Northeast',
    'Mid_Atlantic': 'Mid-Atlantic',
    'Southeast': 'Southeast',
    'Midwest': 'Midwest',
    'South': 'South',
    'West': 'West',
    'Southwest': 'Southwest',
    'Pacific_Northwest': 'Pacific Northwest'
  };
  return names[region];
}
