import { describe, test, expect } from 'vitest';
import { optimizeScreenshot, getOptimalResolution, inferDetailLevel, estimateImageTokens } from './screenshot-optimizer';
import fs from 'fs';
import path from 'path';

describe('Screenshot Optimizer', () => {
  test('reduces image size while maintaining quality', async () => {
    const testImage = fs.readFileSync(
      path.join(__dirname, '../../test-fixtures/map-screenshot.png')
    );

    const optimized = await optimizeScreenshot(testImage, {
      maxWidth: 1280,
      quality: 85
    });

    expect(optimized.byteLength).toBeLessThan(testImage.byteLength);
    expect(optimized.byteLength).toBeLessThan(200 * 1024); // < 200KB
  });

  test('calculates optimal resolution based on detail level', () => {
    expect(getOptimalResolution('low')).toEqual({ width: 800, height: 600 });
    expect(getOptimalResolution('medium')).toEqual({ width: 1280, height: 960 });
    expect(getOptimalResolution('high')).toEqual({ width: 1920, height: 1440 });
  });

  test('infers detail level from query text', () => {
    expect(inferDetailLevel('Can you identify this plant?')).toBe('high');
    expect(inferDetailLevel('What is the exact spacing here?')).toBe('high');
    expect(inferDetailLevel('Give me an overview of this design')).toBe('low');
    expect(inferDetailLevel('Any suggestions for improvement?')).toBe('low');
    expect(inferDetailLevel('How does this look?')).toBe('medium');
  });

  test('estimates image token count', () => {
    // 1280x960 image should be ~1638 tokens
    const tokens = estimateImageTokens(1280, 960);
    expect(tokens).toBeGreaterThan(1500);
    expect(tokens).toBeLessThan(2000);
  });
});
