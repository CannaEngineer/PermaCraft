import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCacheKey,
  hashContext,
  hashScreenshot,
  getCachedResponse,
  cacheResponse,
  clearCache,
  getCacheStats,
} from './response-cache';

describe('Response Cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Hash Functions', () => {
    it('should generate consistent context hashes', () => {
      const context = { farmId: '123', zones: ['zone1', 'zone2'] };
      const hash1 = hashContext(context);
      const hash2 = hashContext(context);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hex = 32 chars
    });

    it('should generate different hashes for different contexts', () => {
      const context1 = { farmId: '123' };
      const context2 = { farmId: '456' };
      expect(hashContext(context1)).not.toBe(hashContext(context2));
    });

    it('should generate consistent screenshot hashes', () => {
      const buffer = Buffer.from('test screenshot data');
      const hash1 = hashScreenshot(buffer);
      const hash2 = hashScreenshot(buffer);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hex = 32 chars
    });

    it('should generate different hashes for different screenshots', () => {
      const buffer1 = Buffer.from('screenshot1');
      const buffer2 = Buffer.from('screenshot2');
      expect(hashScreenshot(buffer1)).not.toBe(hashScreenshot(buffer2));
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const query = 'What plants should I grow?';
      const contextHash = 'abc123';
      const screenshotHash = 'def456';

      const key1 = generateCacheKey(query, contextHash, screenshotHash);
      const key2 = generateCacheKey(query, contextHash, screenshotHash);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should handle missing screenshot hash', () => {
      const query = 'test query';
      const contextHash = 'abc123';

      const key = generateCacheKey(query, contextHash);
      expect(key).toHaveLength(64);
    });

    it('should generate different keys for different queries', () => {
      const contextHash = 'abc123';
      const key1 = generateCacheKey('query1', contextHash);
      const key2 = generateCacheKey('query2', contextHash);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different contexts', () => {
      const query = 'same query';
      const key1 = generateCacheKey(query, 'context1');
      const key2 = generateCacheKey(query, 'context2');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys with/without screenshot', () => {
      const query = 'test';
      const contextHash = 'abc123';

      const key1 = generateCacheKey(query, contextHash);
      const key2 = generateCacheKey(query, contextHash, 'screenshot123');

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Operations', () => {
    it('should return null for cache miss', () => {
      const result = getCachedResponse('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should store and retrieve cached responses', () => {
      const cacheKey = 'test-key';
      const response = 'Test AI response';
      const model = 'gpt-4';

      cacheResponse(cacheKey, response, model);
      const cached = getCachedResponse(cacheKey);

      expect(cached).toBe(response);
    });

    it('should overwrite existing cached responses', () => {
      const cacheKey = 'test-key';

      cacheResponse(cacheKey, 'First response', 'model1');
      cacheResponse(cacheKey, 'Second response', 'model2');

      const cached = getCachedResponse(cacheKey);
      expect(cached).toBe('Second response');
    });

    it('should clear all cached responses', () => {
      cacheResponse('key1', 'response1', 'model1');
      cacheResponse('key2', 'response2', 'model2');

      const stats1 = getCacheStats();
      expect(stats1.size).toBe(2);

      clearCache();

      const stats2 = getCacheStats();
      expect(stats2.size).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache size', () => {
      const stats1 = getCacheStats();
      expect(stats1.size).toBe(0);
      expect(stats1.max).toBe(100);

      cacheResponse('key1', 'response1', 'model1');
      cacheResponse('key2', 'response2', 'model2');

      const stats2 = getCacheStats();
      expect(stats2.size).toBe(2);
    });

    it('should track hit rate', () => {
      const cacheKey = 'test-key';
      cacheResponse(cacheKey, 'test response', 'model');

      // Initial state
      clearCache(); // Reset hit/miss counters
      cacheResponse(cacheKey, 'test response', 'model');

      // 1 hit, 0 misses
      getCachedResponse(cacheKey);
      let stats = getCacheStats();
      expect(stats.hitRate).toBe(1.0);

      // 1 hit, 1 miss
      getCachedResponse('nonexistent-key');
      stats = getCacheStats();
      expect(stats.hitRate).toBe(0.5);

      // 2 hits, 1 miss
      getCachedResponse(cacheKey);
      stats = getCacheStats();
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('Integration Test', () => {
    it('should handle full caching workflow', () => {
      // Prepare data
      const query = 'Design a food forest';
      const context = {
        farmId: 'farm-123',
        climate: 'temperate',
        zones: ['zone1', 'zone2']
      };
      const screenshot = Buffer.from('mock screenshot data');

      // Generate hashes
      const contextHash = hashContext(context);
      const screenshotHash = hashScreenshot(screenshot);
      const cacheKey = generateCacheKey(query, contextHash, screenshotHash);

      // First call - cache miss
      let cached = getCachedResponse(cacheKey);
      expect(cached).toBeNull();

      // Store response
      const aiResponse = 'Consider planting oak trees in zone 1...';
      cacheResponse(cacheKey, aiResponse, 'gpt-4');

      // Second call - cache hit
      cached = getCachedResponse(cacheKey);
      expect(cached).toBe(aiResponse);

      // Stats should show successful caching
      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });
});
