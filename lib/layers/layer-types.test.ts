import { describe, test, expect } from 'vitest';
import { createDefaultLayers, getLayerOrder, validateLayerId } from './layer-types';

describe('Layer Types', () => {
  test('creates default layers with correct properties', () => {
    const layers = createDefaultLayers('farm-123');

    expect(layers).toHaveLength(5);
    expect(layers[0]).toMatchObject({
      name: 'Zones',
      featureType: 'zone',
      visible: 1,
      locked: 0,
      display_order: 1
    });
  });

  test('calculates layer z-index order correctly', () => {
    const layers = createDefaultLayers('farm-123').map(l => ({
      ...l,
      created_at: Date.now()
    })) as any;
    const order = getLayerOrder(layers);

    expect(order[0].name).toBe('Zones'); // Bottom
    expect(order[order.length - 1].name).toBe('Annotations'); // Top
  });

  test('validates layer IDs', () => {
    expect(validateLayerId('farm-123-layer-zones')).toBe(true);
    expect(validateLayerId('invalid')).toBe(false);
  });
});
