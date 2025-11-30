export interface ZoneTypeConfig {
  value: string;
  label: string;
  color: string;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
}

export const ZONE_TYPES: Record<string, ZoneTypeConfig> = {
  // Farm Boundary (special type, transparent fill, purple)
  farm_boundary: {
    value: "farm_boundary",
    label: "Farm Boundary",
    color: "#9333ea",
    fillColor: "#9333ea",
    fillOpacity: 0,
    strokeColor: "#9333ea",
    strokeWidth: 3,
  },

  // Permaculture Zones
  zone_0: {
    value: "zone_0",
    label: "Zone 0 (House)",
    color: "#dc2626",
    fillColor: "#dc2626",
    fillOpacity: 0.2,
    strokeColor: "#dc2626",
    strokeWidth: 2,
  },
  zone_1: {
    value: "zone_1",
    label: "Zone 1 (Kitchen Garden)",
    color: "#16a34a",
    fillColor: "#16a34a",
    fillOpacity: 0.2,
    strokeColor: "#16a34a",
    strokeWidth: 2,
  },
  zone_2: {
    value: "zone_2",
    label: "Zone 2 (Orchard)",
    color: "#84cc16",
    fillColor: "#84cc16",
    fillOpacity: 0.2,
    strokeColor: "#84cc16",
    strokeWidth: 2,
  },
  zone_3: {
    value: "zone_3",
    label: "Zone 3 (Main Crops)",
    color: "#eab308",
    fillColor: "#eab308",
    fillOpacity: 0.2,
    strokeColor: "#eab308",
    strokeWidth: 2,
  },
  zone_4: {
    value: "zone_4",
    label: "Zone 4 (Pasture/Woodland)",
    color: "#d97706",
    fillColor: "#d97706",
    fillOpacity: 0.2,
    strokeColor: "#d97706",
    strokeWidth: 2,
  },
  zone_5: {
    value: "zone_5",
    label: "Zone 5 (Wilderness)",
    color: "#78716c",
    fillColor: "#78716c",
    fillOpacity: 0.2,
    strokeColor: "#78716c",
    strokeWidth: 2,
  },

  // Water Features
  water_body: {
    value: "water_body",
    label: "Water Body (Pond/Lake)",
    color: "#0ea5e9",
    fillColor: "#0ea5e9",
    fillOpacity: 0.3,
    strokeColor: "#0284c7",
    strokeWidth: 2,
  },
  water_flow: {
    value: "water_flow",
    label: "Water Flow (Stream)",
    color: "#06b6d4",
    fillColor: "#06b6d4",
    fillOpacity: 0.3,
    strokeColor: "#0891b2",
    strokeWidth: 3,
  },
  swale: {
    value: "swale",
    label: "Swale",
    color: "#0284c7",
    fillColor: "#0284c7",
    fillOpacity: 0.15,
    strokeColor: "#0369a1",
    strokeWidth: 2,
  },
  pond: {
    value: "pond",
    label: "Pond",
    color: "#0ea5e9",
    fillColor: "#0ea5e9",
    fillOpacity: 0.3,
    strokeColor: "#0284c7",
    strokeWidth: 2,
  },

  // Structures & Infrastructure
  structure: {
    value: "structure",
    label: "Structure (Building)",
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.3,
    strokeColor: "#dc2626",
    strokeWidth: 2,
  },
  path: {
    value: "path",
    label: "Path/Road",
    color: "#94a3b8",
    fillColor: "#94a3b8",
    fillOpacity: 0.3,
    strokeColor: "#64748b",
    strokeWidth: 2,
  },
  fence: {
    value: "fence",
    label: "Fence",
    color: "#71717a",
    fillColor: "#71717a",
    fillOpacity: 0.1,
    strokeColor: "#52525b",
    strokeWidth: 2,
  },

  // Agroforestry Systems
  food_forest: {
    value: "food_forest",
    label: "Food Forest",
    color: "#22c55e",
    fillColor: "#22c55e",
    fillOpacity: 0.25,
    strokeColor: "#16a34a",
    strokeWidth: 2,
  },
  silvopasture: {
    value: "silvopasture",
    label: "Silvopasture",
    color: "#84cc16",
    fillColor: "#84cc16",
    fillOpacity: 0.2,
    strokeColor: "#65a30d",
    strokeWidth: 2,
  },
  alley_crop: {
    value: "alley_crop",
    label: "Alley Cropping",
    color: "#a3e635",
    fillColor: "#a3e635",
    fillOpacity: 0.2,
    strokeColor: "#84cc16",
    strokeWidth: 2,
  },
  windbreak: {
    value: "windbreak",
    label: "Windbreak",
    color: "#15803d",
    fillColor: "#15803d",
    fillOpacity: 0.2,
    strokeColor: "#166534",
    strokeWidth: 2,
  },

  // Agricultural Areas
  annual_garden: {
    value: "annual_garden",
    label: "Annual Garden",
    color: "#facc15",
    fillColor: "#facc15",
    fillOpacity: 0.2,
    strokeColor: "#eab308",
    strokeWidth: 2,
  },
  orchard: {
    value: "orchard",
    label: "Orchard",
    color: "#fb923c",
    fillColor: "#fb923c",
    fillOpacity: 0.2,
    strokeColor: "#f97316",
    strokeWidth: 2,
  },
  pasture: {
    value: "pasture",
    label: "Pasture",
    color: "#a3e635",
    fillColor: "#a3e635",
    fillOpacity: 0.2,
    strokeColor: "#84cc16",
    strokeWidth: 2,
  },
  woodland: {
    value: "woodland",
    label: "Woodland",
    color: "#22c55e",
    fillColor: "#22c55e",
    fillOpacity: 0.2,
    strokeColor: "#16a34a",
    strokeWidth: 2,
  },

  // Default/Other
  other: {
    value: "other",
    label: "Other",
    color: "#64748b",
    fillColor: "#64748b",
    fillOpacity: 0.15,
    strokeColor: "#475569",
    strokeWidth: 2,
  },
};

export const ZONE_TYPE_CATEGORIES = {
  "Permaculture Zones": ["zone_0", "zone_1", "zone_2", "zone_3", "zone_4", "zone_5"],
  "Water Features": ["water_body", "water_flow", "swale", "pond"],
  "Structures": ["structure", "path", "fence"],
  "Agroforestry": ["food_forest", "silvopasture", "alley_crop", "windbreak"],
  "Agricultural": ["annual_garden", "orchard", "pasture", "woodland"],
  "Other": ["other"],
};

// Zone types that users can select (excludes farm_boundary which is auto-assigned)
export const USER_SELECTABLE_ZONE_TYPES = ZONE_TYPE_CATEGORIES;

export function getZoneTypeConfig(zoneType: string): ZoneTypeConfig {
  return ZONE_TYPES[zoneType] || ZONE_TYPES.other;
}
