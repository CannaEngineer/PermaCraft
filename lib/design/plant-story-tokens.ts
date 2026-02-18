// lib/design/plant-story-tokens.ts
// Design tokens for the Plant Story experience

export const LAYER_GRADIENTS: Record<string, string> = {
  canopy: 'from-green-800/90 to-green-600/80',
  understory: 'from-green-700/90 to-green-500/80',
  shrub: 'from-emerald-700/90 to-emerald-500/80',
  herbaceous: 'from-green-600/90 to-lime-500/80',
  groundcover: 'from-lime-700/90 to-lime-500/80',
  vine: 'from-amber-700/90 to-amber-500/80',
  root: 'from-orange-700/90 to-orange-500/80',
  aquatic: 'from-blue-700/90 to-blue-500/80',
};

export const LAYER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  canopy: { bg: 'bg-green-700/10', text: 'text-green-700', border: 'border-green-300' },
  understory: { bg: 'bg-green-600/10', text: 'text-green-600', border: 'border-green-300' },
  shrub: { bg: 'bg-emerald-600/10', text: 'text-emerald-600', border: 'border-emerald-300' },
  herbaceous: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-300' },
  groundcover: { bg: 'bg-lime-600/10', text: 'text-lime-600', border: 'border-lime-300' },
  vine: { bg: 'bg-amber-600/10', text: 'text-amber-600', border: 'border-amber-300' },
  root: { bg: 'bg-orange-600/10', text: 'text-orange-600', border: 'border-orange-300' },
  aquatic: { bg: 'bg-blue-600/10', text: 'text-blue-600', border: 'border-blue-300' },
};

export const LAYER_EMOJIS: Record<string, string> = {
  canopy: '🌳',
  understory: '🌲',
  shrub: '🌿',
  herbaceous: '🌱',
  groundcover: '🍃',
  vine: '🌾',
  root: '🥕',
  aquatic: '💧',
};

export const STORY_CARD = {
  base: 'h-screen snap-start snap-always flex items-center justify-center p-4 md:p-8',
  inner: 'w-full max-w-2xl mx-auto',
  animation: {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    viewport: { once: true, amount: 0.3 },
  },
} as const;

export const STORY_TYPOGRAPHY = {
  heroTitle: 'text-4xl md:text-5xl lg:text-6xl font-serif font-bold',
  heroSubtitle: 'text-lg md:text-xl text-muted-foreground italic',
  cardTitle: 'text-2xl md:text-3xl font-serif font-bold',
  cardSubtitle: 'text-sm md:text-base text-muted-foreground',
  body: 'text-base md:text-lg leading-relaxed',
  label: 'text-xs uppercase tracking-wider font-medium',
} as const;
