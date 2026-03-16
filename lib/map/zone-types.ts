/**
 * Zone Type Design System
 *
 * A carefully curated palette and taxonomy for permaculture landscape zones.
 * Each color is chosen to:
 *  - Be instantly distinguishable from every other zone type on satellite imagery
 *  - Echo the real-world appearance of what it represents
 *  - Maintain readability at fill opacities between 0.12 and 0.32
 *  - Look professional when exported or printed
 *
 * Color Rules:
 *  - Stroke colors are always a darker shade of the fill (10-15% luminance drop)
 *  - No two zone types in the same category share a hue
 *  - Water is always blue, vegetation is always green-spectrum,
 *    infrastructure is always warm neutral
 */

export interface ZoneTypeConfig {
  value: string;
  label: string;
  color: string;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  /** Short tooltip description for mobile UI */
  description?: string;
  /** Lucide icon name for visual identification in pickers */
  icon?: string;
}

export const ZONE_TYPES: Record<string, ZoneTypeConfig> = {
  // ── Farm Boundary ────────────────────────────────
  // Special system type. Transparent fill, purple dashed stroke.
  farm_boundary: {
    value: 'farm_boundary',
    label: 'Farm Boundary',
    color: '#9333ea',
    fillColor: '#9333ea',
    fillOpacity: 0,
    strokeColor: '#9333ea',
    strokeWidth: 3,
    description: 'Property boundary outline',
    icon: 'map',
  },

  // ── Permaculture Zones (0–5) ─────────────────────
  // Warm-to-cool gradient: intense activity (warm) → wild (cool).
  // This mirrors the classic permaculture concentric zone model.
  zone_0: {
    value: 'zone_0',
    label: 'Zone 0 (Home)',
    color: '#b91c1c',
    fillColor: '#b91c1c',
    fillOpacity: 0.22,
    strokeColor: '#991b1b',
    strokeWidth: 2.5,
    description: 'The house and immediate living space',
    icon: 'home',
  },
  zone_1: {
    value: 'zone_1',
    label: 'Zone 1 (Kitchen Garden)',
    color: '#c2410c',
    fillColor: '#c2410c',
    fillOpacity: 0.20,
    strokeColor: '#9a3412',
    strokeWidth: 2,
    description: 'Intensive daily-use garden closest to home',
    icon: 'flower-2',
  },
  zone_2: {
    value: 'zone_2',
    label: 'Zone 2 (Perennial Systems)',
    color: '#b45309',
    fillColor: '#b45309',
    fillOpacity: 0.18,
    strokeColor: '#92400e',
    strokeWidth: 2,
    description: 'Orchards, food forests, and perennial beds',
    icon: 'trees',
  },
  zone_3: {
    value: 'zone_3',
    label: 'Zone 3 (Main Crops)',
    color: '#a16207',
    fillColor: '#a16207',
    fillOpacity: 0.18,
    strokeColor: '#854d0e',
    strokeWidth: 2,
    description: 'Broadscale annual crops and field systems',
    icon: 'wheat',
  },
  zone_4: {
    value: 'zone_4',
    label: 'Zone 4 (Managed Wild)',
    color: '#4d7c0f',
    fillColor: '#4d7c0f',
    fillOpacity: 0.16,
    strokeColor: '#3f6212',
    strokeWidth: 2,
    description: 'Semi-wild: foraging, timber, grazing',
    icon: 'mountain',
  },
  zone_5: {
    value: 'zone_5',
    label: 'Zone 5 (Wilderness)',
    color: '#166534',
    fillColor: '#166534',
    fillOpacity: 0.14,
    strokeColor: '#14532d',
    strokeWidth: 2,
    description: 'Unmanaged wild area — observe and learn',
    icon: 'leaf',
  },

  // ── Water Features ───────────────────────────────
  // Blues with distinct hues: teal for moving water, sky for still.
  water_body: {
    value: 'water_body',
    label: 'Water Body',
    color: '#0284c7',
    fillColor: '#0284c7',
    fillOpacity: 0.30,
    strokeColor: '#075985',
    strokeWidth: 2,
    description: 'Lake, reservoir, or large water feature',
    icon: 'waves',
  },
  water_flow: {
    value: 'water_flow',
    label: 'Stream / Creek',
    color: '#0891b2',
    fillColor: '#0891b2',
    fillOpacity: 0.28,
    strokeColor: '#0e7490',
    strokeWidth: 2.5,
    description: 'Natural stream or creek corridor',
    icon: 'droplets',
  },
  swale: {
    value: 'swale',
    label: 'Swale',
    color: '#0369a1',
    fillColor: '#0369a1',
    fillOpacity: 0.18,
    strokeColor: '#075985',
    strokeWidth: 2,
    description: 'On-contour water harvesting earthwork',
    icon: 'move-horizontal',
  },
  pond: {
    value: 'pond',
    label: 'Pond',
    color: '#0ea5e9',
    fillColor: '#0ea5e9',
    fillOpacity: 0.32,
    strokeColor: '#0284c7',
    strokeWidth: 2,
    description: 'Small constructed or natural pond',
    icon: 'circle',
  },
  rain_garden: {
    value: 'rain_garden',
    label: 'Rain Garden',
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.20,
    strokeColor: '#2563eb',
    strokeWidth: 2,
    description: 'Planted depression for stormwater infiltration',
    icon: 'cloud-rain',
  },
  wetland: {
    value: 'wetland',
    label: 'Wetland',
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.25,
    strokeColor: '#0891b2',
    strokeWidth: 2,
    description: 'Natural or constructed wetland area',
    icon: 'flower',
  },

  // ── Growing Systems ──────────────────────────────
  // Greens differentiated by temperature: warm greens for food, cool for forest.
  food_forest: {
    value: 'food_forest',
    label: 'Food Forest',
    color: '#15803d',
    fillColor: '#15803d',
    fillOpacity: 0.25,
    strokeColor: '#166534',
    strokeWidth: 2.5,
    description: 'Multi-layered edible forest ecosystem',
    icon: 'tree-pine',
  },
  annual_garden: {
    value: 'annual_garden',
    label: 'Annual Garden',
    color: '#65a30d',
    fillColor: '#65a30d',
    fillOpacity: 0.20,
    strokeColor: '#4d7c0f',
    strokeWidth: 2,
    description: 'Annual vegetable and herb production',
    icon: 'sprout',
  },
  orchard: {
    value: 'orchard',
    label: 'Orchard',
    color: '#ea580c',
    fillColor: '#ea580c',
    fillOpacity: 0.20,
    strokeColor: '#c2410c',
    strokeWidth: 2,
    description: 'Fruit or nut tree planting',
    icon: 'apple',
  },
  alley_crop: {
    value: 'alley_crop',
    label: 'Alley Cropping',
    color: '#84cc16',
    fillColor: '#84cc16',
    fillOpacity: 0.18,
    strokeColor: '#65a30d',
    strokeWidth: 2,
    description: 'Trees with crop alleys between rows',
    icon: 'rows-3',
  },
  nursery: {
    value: 'nursery',
    label: 'Nursery',
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.20,
    strokeColor: '#16a34a',
    strokeWidth: 2,
    description: 'Plant propagation and seedling area',
    icon: 'sprout',
  },
  herb_spiral: {
    value: 'herb_spiral',
    label: 'Herb Spiral',
    color: '#059669',
    fillColor: '#059669',
    fillOpacity: 0.22,
    strokeColor: '#047857',
    strokeWidth: 2,
    description: 'Spiral-shaped raised herb bed with microclimates',
    icon: 'loader',
  },
  keyhole_bed: {
    value: 'keyhole_bed',
    label: 'Keyhole Bed',
    color: '#10b981',
    fillColor: '#10b981',
    fillOpacity: 0.20,
    strokeColor: '#059669',
    strokeWidth: 2,
    description: 'Circular raised bed with compost basket center',
    icon: 'circle-dot',
  },
  hugelkultur: {
    value: 'hugelkultur',
    label: 'Hugelkultur',
    color: '#7c3aed',
    fillColor: '#7c3aed',
    fillOpacity: 0.18,
    strokeColor: '#6d28d9',
    strokeWidth: 2,
    description: 'Mounded wood-core raised bed',
    icon: 'mountain',
  },

  // ── Infrastructure ───────────────────────────────
  // Warm neutrals and architectural tones — distinct from nature.
  structure: {
    value: 'structure',
    label: 'Building',
    color: '#78716c',
    fillColor: '#78716c',
    fillOpacity: 0.30,
    strokeColor: '#57534e',
    strokeWidth: 2.5,
    description: 'House, barn, shed, or outbuilding',
    icon: 'building',
  },
  greenhouse: {
    value: 'greenhouse',
    label: 'Greenhouse',
    color: '#a8a29e',
    fillColor: '#a8a29e',
    fillOpacity: 0.22,
    strokeColor: '#78716c',
    strokeWidth: 2,
    description: 'Greenhouse, polytunnel, or cold frame',
    icon: 'warehouse',
  },
  path: {
    value: 'path',
    label: 'Path / Road',
    color: '#a1887f',
    fillColor: '#a1887f',
    fillOpacity: 0.28,
    strokeColor: '#8d6e63',
    strokeWidth: 2,
    description: 'Walking path, access road, or driveway',
    icon: 'road',
  },
  fence: {
    value: 'fence',
    label: 'Fence',
    color: '#8d6e63',
    fillColor: '#8d6e63',
    fillOpacity: 0.12,
    strokeColor: '#6d4c41',
    strokeWidth: 2,
    description: 'Fence line or barrier',
    icon: 'minus',
  },
  compost: {
    value: 'compost',
    label: 'Compost Area',
    color: '#92400e',
    fillColor: '#92400e',
    fillOpacity: 0.22,
    strokeColor: '#78350f',
    strokeWidth: 2,
    description: 'Compost bays, worm farm, or biochar area',
    icon: 'recycle',
  },

  // ── Pasture & Livestock ──────────────────────────
  // Golden and amber tones evoking grassland and straw.
  pasture: {
    value: 'pasture',
    label: 'Pasture',
    color: '#ca8a04',
    fillColor: '#ca8a04',
    fillOpacity: 0.18,
    strokeColor: '#a16207',
    strokeWidth: 2,
    description: 'Grazing pasture or hay field',
    icon: 'sun',
  },
  silvopasture: {
    value: 'silvopasture',
    label: 'Silvopasture',
    color: '#a3a23a',
    fillColor: '#a3a23a',
    fillOpacity: 0.18,
    strokeColor: '#858424',
    strokeWidth: 2,
    description: 'Trees integrated with grazing land',
    icon: 'tree-deciduous',
  },
  paddock: {
    value: 'paddock',
    label: 'Paddock',
    color: '#d97706',
    fillColor: '#d97706',
    fillOpacity: 0.16,
    strokeColor: '#b45309',
    strokeWidth: 2,
    description: 'Rotational grazing subdivision',
    icon: 'grid-2x2',
  },
  chicken_run: {
    value: 'chicken_run',
    label: 'Chicken Run',
    color: '#dc2626',
    fillColor: '#dc2626',
    fillOpacity: 0.16,
    strokeColor: '#b91c1c',
    strokeWidth: 2,
    description: 'Poultry tractoring or free-range area',
    icon: 'egg',
  },
  bee_yard: {
    value: 'bee_yard',
    label: 'Bee Yard',
    color: '#eab308',
    fillColor: '#eab308',
    fillOpacity: 0.20,
    strokeColor: '#ca8a04',
    strokeWidth: 2,
    description: 'Apiary and pollinator habitat',
    icon: 'hexagon',
  },

  // ── Natural Areas ────────────────────────────────
  // Muted earth tones and deep greens — low intervention, wild beauty.
  woodland: {
    value: 'woodland',
    label: 'Woodland',
    color: '#1a5c2e',
    fillColor: '#1a5c2e',
    fillOpacity: 0.20,
    strokeColor: '#14532d',
    strokeWidth: 2,
    description: 'Native or managed woodland',
    icon: 'trees',
  },
  meadow: {
    value: 'meadow',
    label: 'Meadow',
    color: '#a3e635',
    fillColor: '#a3e635',
    fillOpacity: 0.16,
    strokeColor: '#84cc16',
    strokeWidth: 2,
    description: 'Wildflower meadow or native grassland',
    icon: 'flower-2',
  },
  windbreak: {
    value: 'windbreak',
    label: 'Windbreak / Shelterbelt',
    color: '#2d6a4f',
    fillColor: '#2d6a4f',
    fillOpacity: 0.22,
    strokeColor: '#1b4332',
    strokeWidth: 2.5,
    description: 'Protective tree row against prevailing winds',
    icon: 'wind',
  },
  wildlife_corridor: {
    value: 'wildlife_corridor',
    label: 'Wildlife Corridor',
    color: '#3b6f3b',
    fillColor: '#3b6f3b',
    fillOpacity: 0.14,
    strokeColor: '#2d5a2d',
    strokeWidth: 2,
    description: 'Connected habitat passage for wildlife movement',
    icon: 'rabbit',
  },

  // ── Default / Other ──────────────────────────────
  other: {
    value: 'other',
    label: 'Other',
    color: '#64748b',
    fillColor: '#64748b',
    fillOpacity: 0.15,
    strokeColor: '#475569',
    strokeWidth: 2,
    description: 'Unspecified or custom zone type',
    icon: 'square',
  },
};

// ─────────────────────────────────────────────────────
// Zone Categories — Organized for the picker UI
// ─────────────────────────────────────────────────────

export const ZONE_TYPE_CATEGORIES: Record<string, string[]> = {
  'Site Zones':          ['zone_0', 'zone_1', 'zone_2', 'zone_3', 'zone_4', 'zone_5'],
  'Water Features':      ['pond', 'water_body', 'water_flow', 'swale', 'rain_garden', 'wetland'],
  'Growing Systems':     ['food_forest', 'annual_garden', 'orchard', 'alley_crop', 'nursery', 'herb_spiral', 'keyhole_bed', 'hugelkultur'],
  'Infrastructure':      ['structure', 'greenhouse', 'path', 'fence', 'compost'],
  'Pasture & Livestock': ['pasture', 'silvopasture', 'paddock', 'chicken_run', 'bee_yard'],
  'Natural Areas':       ['woodland', 'meadow', 'windbreak', 'wildlife_corridor'],
  'Other':               ['other'],
};

/** Category descriptions for tooltips in the picker */
export const ZONE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Site Zones':          'Classic permaculture zones by proximity and use intensity',
  'Water Features':      'Ponds, streams, swales, and water harvesting',
  'Growing Systems':     'Food forests, gardens, orchards, and specialty beds',
  'Infrastructure':      'Buildings, paths, fences, and work areas',
  'Pasture & Livestock': 'Grazing, animal systems, and pollinators',
  'Natural Areas':       'Woodland, meadow, habitat, and windbreaks',
  'Other':               'Custom or uncategorized areas',
};

/** Category icons (Lucide icon names) for the picker */
export const ZONE_CATEGORY_ICONS: Record<string, string> = {
  'Site Zones':          'target',
  'Water Features':      'droplets',
  'Growing Systems':     'sprout',
  'Infrastructure':      'building',
  'Pasture & Livestock': 'fence',
  'Natural Areas':       'trees',
  'Other':               'shapes',
};

// Zone types that users can select (excludes farm_boundary which is auto-assigned)
export const USER_SELECTABLE_ZONE_TYPES = ZONE_TYPE_CATEGORIES;

/**
 * Get the configuration for a zone type, falling back to 'other' for unknown types.
 */
export function getZoneTypeConfig(zoneType: string): ZoneTypeConfig {
  return ZONE_TYPES[zoneType] || ZONE_TYPES.other;
}

/**
 * Get all zone types in a flat array, ordered by category.
 * Useful for dropdowns and sequential display.
 */
export function getOrderedZoneTypes(): ZoneTypeConfig[] {
  const seen = new Set<string>();
  const result: ZoneTypeConfig[] = [];

  for (const types of Object.values(ZONE_TYPE_CATEGORIES)) {
    for (const type of types) {
      if (!seen.has(type) && ZONE_TYPES[type]) {
        seen.add(type);
        result.push(ZONE_TYPES[type]);
      }
    }
  }

  return result;
}
