import type { LineStyle } from '@/lib/db/schema';

export interface LineTypeConfig {
  value: string;
  label: string;
  defaultStyle: LineStyle;
  description: string;
}

export const LINE_TYPES: Record<string, LineTypeConfig> = {
  swale: {
    value: 'swale',
    label: 'Swale',
    description: 'Water management swale along contour',
    defaultStyle: {
      color: '#0ea5e9',
      width: 3,
      opacity: 0.8,
      arrowDirection: 'none'
    }
  },
  flow_path: {
    value: 'flow_path',
    label: 'Flow Path',
    description: 'Water flow direction (surface or underground)',
    defaultStyle: {
      color: '#06b6d4',
      width: 2,
      dashArray: [4, 2],
      opacity: 0.7,
      arrowDirection: 'forward'
    }
  },
  fence: {
    value: 'fence',
    label: 'Fence',
    description: 'Fence line or boundary',
    defaultStyle: {
      color: '#71717a',
      width: 2,
      dashArray: [1, 3],
      opacity: 0.6,
      arrowDirection: 'none'
    }
  },
  hedge: {
    value: 'hedge',
    label: 'Hedge Row',
    description: 'Hedge or windbreak line',
    defaultStyle: {
      color: '#22c55e',
      width: 3,
      opacity: 0.7,
      arrowDirection: 'none'
    }
  },
  contour: {
    value: 'contour',
    label: 'Contour Line',
    description: 'Elevation contour reference',
    defaultStyle: {
      color: '#78716c',
      width: 1,
      opacity: 0.5,
      arrowDirection: 'none'
    }
  },
  custom: {
    value: 'custom',
    label: 'Custom',
    description: 'User-defined line',
    defaultStyle: {
      color: '#64748b',
      width: 2,
      opacity: 0.7,
      arrowDirection: 'none'
    }
  }
};

export function getLineTypeConfig(lineType: string): LineTypeConfig {
  return LINE_TYPES[lineType] || LINE_TYPES.custom;
}
