// lib/design/map-info-tokens.ts
export const MAP_INFO_TOKENS = {
  spacing: {
    card: {
      padding: 'p-4',
      gap: 'gap-3',
      margin: 'mb-3'
    },
    section: {
      padding: 'p-6',
      gap: 'gap-4'
    }
  },
  typography: {
    title: 'text-sm font-semibold text-foreground',
    subtitle: 'text-xs font-medium text-muted-foreground',
    value: 'text-2xl font-bold text-foreground',
    label: 'text-xs text-muted-foreground uppercase tracking-wide',
    metric: 'text-lg font-semibold text-foreground'
  },
  colors: {
    card: {
      background: 'bg-card',
      border: 'border border-border',
      hover: 'hover:bg-accent/50'
    },
    status: {
      success: 'bg-green-500/10 text-green-700 dark:text-green-400',
      warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      error: 'bg-red-500/10 text-red-700 dark:text-red-400',
      info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    }
  },
  animation: {
    card: 'transition-all duration-200 ease-in-out',
    slide: 'transition-transform duration-300 ease-out',
    fade: 'transition-opacity duration-200'
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md',
    drawer: 'shadow-xl'
  }
} as const;

export type MapInfoTokens = typeof MAP_INFO_TOKENS;
