/**
 * Line Type Design System
 *
 * Professional landscape line types for water management, boundaries,
 * access, and ecological connectivity. Each line has a distinct visual
 * signature — color, width, dash pattern, and optional directional arrows.
 */

import type { LineStyle } from '@/lib/db/schema';

export interface LineTypeConfig {
  value: string;
  label: string;
  defaultStyle: LineStyle;
  description: string;
  /** Lucide icon name for picker UI */
  icon?: string;
  /** Category for grouping in the picker */
  category?: string;
}

export const LINE_TYPES: Record<string, LineTypeConfig> = {
  // ── Water Lines ───────────────────────────────────
  swale: {
    value: 'swale',
    label: 'Swale',
    description: 'On-contour water harvesting earthwork',
    icon: 'move-horizontal',
    category: 'Water',
    defaultStyle: {
      color: '#0369a1',
      width: 3,
      opacity: 0.85,
      arrowDirection: 'none',
    },
  },
  flow_path: {
    value: 'flow_path',
    label: 'Water Flow',
    description: 'Surface or underground water flow direction',
    icon: 'droplets',
    category: 'Water',
    defaultStyle: {
      color: '#0891b2',
      width: 2.5,
      dashArray: [6, 3],
      opacity: 0.8,
      arrowDirection: 'forward',
    },
  },
  irrigation: {
    value: 'irrigation',
    label: 'Irrigation Line',
    description: 'Drip line, sprinkler, or water supply pipe',
    icon: 'pipette',
    category: 'Water',
    defaultStyle: {
      color: '#2563eb',
      width: 2,
      dashArray: [2, 4],
      opacity: 0.7,
      arrowDirection: 'forward',
    },
  },
  drainage: {
    value: 'drainage',
    label: 'Drainage',
    description: 'French drain, subsurface drainage, or overflow',
    icon: 'arrow-down-to-line',
    category: 'Water',
    defaultStyle: {
      color: '#6366f1',
      width: 2,
      dashArray: [4, 2, 1, 2],
      opacity: 0.65,
      arrowDirection: 'forward',
    },
  },

  // ── Boundaries & Barriers ────────────────────────
  fence: {
    value: 'fence',
    label: 'Fence',
    description: 'Fence line, wall, or barrier',
    icon: 'minus',
    category: 'Boundary',
    defaultStyle: {
      color: '#8d6e63',
      width: 2,
      dashArray: [2, 4],
      opacity: 0.7,
      arrowDirection: 'none',
    },
  },
  hedge: {
    value: 'hedge',
    label: 'Hedge Row',
    description: 'Living hedge, privacy screen, or windbreak row',
    icon: 'trees',
    category: 'Boundary',
    defaultStyle: {
      color: '#2d6a4f',
      width: 3.5,
      opacity: 0.75,
      arrowDirection: 'none',
    },
  },
  garden_edge: {
    value: 'garden_edge',
    label: 'Garden Edge',
    description: 'Bed border, raised bed outline, or edging',
    icon: 'square',
    category: 'Boundary',
    defaultStyle: {
      color: '#65a30d',
      width: 1.5,
      opacity: 0.6,
      arrowDirection: 'none',
    },
  },

  // ── Topography ───────────────────────────────────
  contour: {
    value: 'contour',
    label: 'Contour Line',
    description: 'Elevation contour reference line',
    icon: 'mountain',
    category: 'Topography',
    defaultStyle: {
      color: '#78716c',
      width: 1,
      opacity: 0.45,
      arrowDirection: 'none',
    },
  },
  terrace: {
    value: 'terrace',
    label: 'Terrace',
    description: 'Terraced slope or bench',
    icon: 'align-justify',
    category: 'Topography',
    defaultStyle: {
      color: '#a1887f',
      width: 2.5,
      dashArray: [8, 2],
      opacity: 0.65,
      arrowDirection: 'none',
    },
  },

  // ── Access & Circulation ─────────────────────────
  access_path: {
    value: 'access_path',
    label: 'Access Path',
    description: 'Walking path, trail, or farm road centerline',
    icon: 'footprints',
    category: 'Access',
    defaultStyle: {
      color: '#a1887f',
      width: 2,
      dashArray: [6, 4],
      opacity: 0.6,
      arrowDirection: 'none',
    },
  },

  // ── Ecology ──────────────────────────────────────
  wildlife_corridor: {
    value: 'wildlife_corridor',
    label: 'Wildlife Corridor',
    description: 'Habitat connectivity line for wildlife movement',
    icon: 'rabbit',
    category: 'Ecology',
    defaultStyle: {
      color: '#3b6f3b',
      width: 3,
      dashArray: [8, 4],
      opacity: 0.5,
      arrowDirection: 'none',
    },
  },

  // ── Custom ───────────────────────────────────────
  custom: {
    value: 'custom',
    label: 'Custom Line',
    description: 'User-defined line with custom styling',
    icon: 'pencil',
    category: 'Other',
    defaultStyle: {
      color: '#64748b',
      width: 2,
      opacity: 0.7,
      arrowDirection: 'none',
    },
  },
};

/** Line categories for picker UI grouping */
export const LINE_TYPE_CATEGORIES: Record<string, string[]> = {
  'Water':      ['swale', 'flow_path', 'irrigation', 'drainage'],
  'Boundary':   ['fence', 'hedge', 'garden_edge'],
  'Topography': ['contour', 'terrace'],
  'Access':     ['access_path'],
  'Ecology':    ['wildlife_corridor'],
  'Other':      ['custom'],
};

export function getLineTypeConfig(lineType: string): LineTypeConfig {
  return LINE_TYPES[lineType] || LINE_TYPES.custom;
}
