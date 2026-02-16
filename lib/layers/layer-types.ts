export interface DesignLayer {
  id: string;
  farm_id: string;
  name: string;
  color: string | null;
  description: string | null;
  visible: number; // 0 or 1 (SQLite boolean)
  locked: number; // 0 or 1
  display_order: number; // Z-index
  created_at: number;
}

export interface LayerWithFeatures extends DesignLayer {
  featureCount: number;
}

export type FeatureType = 'zone' | 'planting' | 'line' | 'annotation';

/**
 * Create default layer structure for a new farm
 */
export function createDefaultLayers(farmId: string): Omit<DesignLayer, 'created_at'>[] {
  return [
    {
      id: `${farmId}-layer-zones`,
      farm_id: farmId,
      name: 'Zones',
      color: null,
      description: 'Zone boundaries and areas',
      visible: 1,
      locked: 0,
      display_order: 1,
    },
    {
      id: `${farmId}-layer-plantings`,
      farm_id: farmId,
      name: 'Plantings',
      color: '#22c55e',
      description: 'Individual plants and trees',
      visible: 1,
      locked: 0,
      display_order: 2,
    },
    {
      id: `${farmId}-layer-water`,
      farm_id: farmId,
      name: 'Water Systems',
      color: '#0ea5e9',
      description: 'Swales, ponds, and water flow',
      visible: 1,
      locked: 0,
      display_order: 3,
    },
    {
      id: `${farmId}-layer-infrastructure`,
      farm_id: farmId,
      name: 'Infrastructure',
      color: '#64748b',
      description: 'Paths, fences, and structures',
      visible: 1,
      locked: 0,
      display_order: 4,
    },
    {
      id: `${farmId}-layer-annotations`,
      farm_id: farmId,
      name: 'Annotations',
      color: '#8b5cf6',
      description: 'Notes and labels',
      visible: 1,
      locked: 0,
      display_order: 5,
    }
  ];
}

/**
 * Get layers sorted by display order (z-index)
 */
export function getLayerOrder(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Validate layer ID format
 */
export function validateLayerId(id: string): boolean {
  return /^[a-z0-9-]+-layer-[a-z0-9-]+$/.test(id);
}

/**
 * Check if feature belongs to layer
 */
export function isFeatureInLayer(
  featureLayerIds: string | null,
  layerId: string
): boolean {
  if (!featureLayerIds) return false;
  try {
    const layers = JSON.parse(featureLayerIds);
    return Array.isArray(layers) && layers.includes(layerId);
  } catch {
    return false;
  }
}

/**
 * Add feature to layer
 */
export function addFeatureToLayer(
  currentLayerIds: string | null,
  layerId: string
): string {
  try {
    const layers = currentLayerIds ? JSON.parse(currentLayerIds) : [];
    if (!layers.includes(layerId)) {
      layers.push(layerId);
    }
    return JSON.stringify(layers);
  } catch {
    return JSON.stringify([layerId]);
  }
}

/**
 * Remove feature from layer
 */
export function removeFeatureFromLayer(
  currentLayerIds: string | null,
  layerId: string
): string {
  try {
    const layers = currentLayerIds ? JSON.parse(currentLayerIds) : [];
    const filtered = layers.filter((id: string) => id !== layerId);
    return JSON.stringify(filtered);
  } catch {
    return JSON.stringify([]);
  }
}
