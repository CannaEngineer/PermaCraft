import { describe, it, expect } from 'vitest';
import { getFarmRegion, Region } from './region-mapper';

describe('getFarmRegion', () => {
  it('should map Pacific Northwest coordinates', () => {
    const region = getFarmRegion(47.6062, -122.3321); // Seattle
    expect(region).toBe('Pacific_Northwest');
  });

  it('should map Northeast coordinates', () => {
    const region = getFarmRegion(42.3601, -71.0589); // Boston
    expect(region).toBe('Northeast');
  });

  it('should map Southeast coordinates', () => {
    const region = getFarmRegion(33.7490, -84.3880); // Atlanta
    expect(region).toBe('Southeast');
  });

  it('should map Midwest coordinates', () => {
    const region = getFarmRegion(41.8781, -87.6298); // Chicago
    expect(region).toBe('Midwest');
  });

  it('should map Southwest coordinates', () => {
    const region = getFarmRegion(33.4484, -112.0740); // Phoenix
    expect(region).toBe('Southwest');
  });
});
