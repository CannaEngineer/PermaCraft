/**
 * Permaculture.Studio Design System
 *
 * A unified, world-class design language for permaculture landscape planning.
 * Every color, spacing, and visual token is intentional — designed to produce
 * beautiful, professional-grade farm maps that any landscape architect would
 * be proud to hand off.
 *
 * Design Principles:
 *  1. Clarity — Every zone type is instantly distinguishable at a glance
 *  2. Nature-Aligned — Colors echo the real-world materials they represent
 *  3. Touch-First — All interactive targets ≥ 44px, gestures feel native
 *  4. Progressive Disclosure — Simple on first draw, deep on inspection
 *  5. Print-Ready — Maps look beautiful exported at any resolution
 */

// ─────────────────────────────────────────────────────
// Planting Layer Colors (Forest Garden Strata)
// ─────────────────────────────────────────────────────
// Ordered from tallest to lowest, darkest to lightest.
// The gradient mirrors how light filters through a real forest canopy.

export const PLANTING_LAYER_COLORS: Record<string, string> = {
  canopy:      '#1a4d2e',  // Deep forest — the dominant overstory
  understory:  '#2d7a4a',  // Rich emerald — the mid-canopy shade layer
  shrub:       '#3d9b5b',  // True green — productive shrub layer
  herbaceous:  '#6bb848',  // Bright lime — sun-loving herbs catch light
  groundcover: '#8fce5a',  // Yellow-green — low mat of living mulch
  vine:        '#7c5cbf',  // Amethyst — climbing, weaving through layers
  root:        '#8b5e3c',  // Warm umber — the hidden underground layer
  aquatic:     '#2b7da8',  // Deep teal — ponds and water edges
};

export const PLANTING_LAYER_LABELS: Record<string, string> = {
  canopy:      'Canopy',
  understory:  'Understory',
  shrub:       'Shrub',
  herbaceous:  'Herbaceous',
  groundcover: 'Groundcover',
  vine:        'Vine',
  root:        'Root',
  aquatic:     'Aquatic',
};

// Ordered from top of canopy to deepest root
export const PLANTING_LAYER_ORDER = [
  'canopy', 'understory', 'shrub', 'herbaceous',
  'groundcover', 'vine', 'root', 'aquatic',
] as const;

// ─────────────────────────────────────────────────────
// Design Tokens — Spacing, Typography, Motion
// ─────────────────────────────────────────────────────

export const DESIGN_TOKENS = {
  // Touch targets — Apple HIG minimum is 44pt
  touch: {
    minTarget: 44,       // px — minimum tappable area
    comfortable: 48,     // px — comfortable finger target
    large: 56,           // px — primary action buttons
  },

  // Spacing scale (8pt grid)
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Shadows — layered for depth
  shadow: {
    subtle: '0 1px 3px rgba(0,0,0,0.08)',
    card: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    elevated: '0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
    overlay: '0 8px 32px rgba(0,0,0,0.16), 0 4px 8px rgba(0,0,0,0.08)',
    toolbar: '0 -4px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
  },

  // Motion — spring physics for native feel
  spring: {
    snappy: { stiffness: 400, damping: 30, mass: 0.8 },
    gentle: { stiffness: 200, damping: 25, mass: 1 },
    bouncy: { stiffness: 300, damping: 20, mass: 0.6 },
  },

  // Timing
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
  },

  // Z-index layers — ordered from back to front
  z: {
    map: 0,
    gridOverlay: 5,
    mapControls: 10,
    zones: 15,
    markers: 20,
    toolbar: 30,
    drawer: 55,
    quickLabel: 65,
    overlay: 70,
    modal: 80,
    toast: 90,
  },

  // Map-specific visual tokens
  map: {
    // Zone fill opacity range
    fillOpacity: {
      subtle: 0.12,     // Infrastructure, fences
      light: 0.18,      // General zones, agriculture
      medium: 0.25,     // Growing systems, agroforestry
      strong: 0.32,     // Water features, ponds
    },
    // Stroke widths
    stroke: {
      thin: 1.5,
      normal: 2,
      medium: 2.5,
      thick: 3,
    },
    // Planting marker
    marker: {
      minSize: 14,       // px — minimum visible marker
      borderWidth: 2.5,  // px — white ring around marker
      shadow: '0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
    },
  },
} as const;

// ─────────────────────────────────────────────────────
// Map Info Tokens (backward-compatible upgrade)
// ─────────────────────────────────────────────────────

export const MAP_INFO_TOKENS = {
  spacing: {
    card: {
      padding: 'p-4',
      gap: 'gap-3',
      margin: 'mb-3',
    },
    section: {
      padding: 'p-6',
      gap: 'gap-4',
    },
  },
  typography: {
    title: 'text-sm font-semibold text-foreground tracking-tight',
    subtitle: 'text-xs font-medium text-muted-foreground',
    value: 'text-2xl font-bold text-foreground tabular-nums',
    label: 'text-[11px] text-muted-foreground uppercase tracking-wider font-medium',
    metric: 'text-lg font-semibold text-foreground tabular-nums',
    caption: 'text-[10px] text-muted-foreground',
  },
  colors: {
    card: {
      background: 'bg-card',
      border: 'border border-border/50',
      hover: 'hover:bg-accent/40',
    },
    status: {
      success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      error: 'bg-red-500/10 text-red-700 dark:text-red-400',
      info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
  },
  animation: {
    card: 'transition-all duration-200 ease-out',
    slide: 'transition-transform duration-300 ease-out',
    fade: 'transition-opacity duration-200 ease-out',
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md',
    drawer: 'shadow-xl',
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
export type MapInfoTokens = typeof MAP_INFO_TOKENS;
