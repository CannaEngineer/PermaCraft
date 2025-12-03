import { describe, it, expect } from 'vitest';
import { getFarmRegion, getRegionName, Region } from './region-mapper';

describe('getFarmRegion', () => {
  it('should map Pacific Northwest coordinates', () => {
    const region = getFarmRegion(47.6062, -122.3321); // Seattle
    expect(region).toBe('Pacific_Northwest');
  });

  it('should map Northeast coordinates', () => {
    const region = getFarmRegion(42.3601, -71.0589); // Boston
    expect(region).toBe('Northeast');
  });

  it('should map Mid_Atlantic coordinates', () => {
    const region = getFarmRegion(37.5407, -77.4360); // Richmond, VA
    expect(region).toBe('Mid_Atlantic');
  });

  it('should map Southeast coordinates', () => {
    const region = getFarmRegion(33.7490, -84.3880); // Atlanta
    expect(region).toBe('Southeast');
  });

  it('should map Midwest coordinates', () => {
    const region = getFarmRegion(41.8781, -87.6298); // Chicago
    expect(region).toBe('Midwest');
  });

  it('should map South coordinates', () => {
    const region = getFarmRegion(29.9511, -90.0715); // New Orleans
    expect(region).toBe('South');
  });

  it('should map West coordinates', () => {
    const region = getFarmRegion(36.1699, -115.1398); // Las Vegas
    expect(region).toBe('West');
  });

  it('should map Southwest coordinates', () => {
    const region = getFarmRegion(33.4484, -112.0740); // Phoenix
    expect(region).toBe('Southwest');
  });
});

describe('getRegionName', () => {
  it('should return "Northeast" for Northeast region', () => {
    expect(getRegionName('Northeast')).toBe('Northeast');
  });

  it('should return "Mid-Atlantic" for Mid_Atlantic region', () => {
    expect(getRegionName('Mid_Atlantic')).toBe('Mid-Atlantic');
  });

  it('should return "Southeast" for Southeast region', () => {
    expect(getRegionName('Southeast')).toBe('Southeast');
  });

  it('should return "Midwest" for Midwest region', () => {
    expect(getRegionName('Midwest')).toBe('Midwest');
  });

  it('should return "South" for South region', () => {
    expect(getRegionName('South')).toBe('South');
  });

  it('should return "West" for West region', () => {
    expect(getRegionName('West')).toBe('West');
  });

  it('should return "Southwest" for Southwest region', () => {
    expect(getRegionName('Southwest')).toBe('Southwest');
  });

  it('should return "Pacific Northwest" for Pacific_Northwest region', () => {
    expect(getRegionName('Pacific_Northwest')).toBe('Pacific Northwest');
  });
});
