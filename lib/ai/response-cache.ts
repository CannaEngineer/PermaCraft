// lib/ai/response-cache.ts
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

interface CachedResponse {
  response: string;
  timestamp: number;
  model: string;
}

// Cache up to 100 responses, 1 hour TTL
const responseCache = new LRUCache<string, CachedResponse>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  updateAgeOnGet: true
});

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(
  query: string,
  contextHash: string,
  screenshotHash?: string
): string {
  const parts = [query, contextHash, screenshotHash || 'no-screenshot'];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Hash context data for cache key
 */
export function hashContext(context: object): string {
  const serialized = JSON.stringify(context);
  return crypto.createHash('md5').update(serialized).digest('hex');
}

/**
 * Hash screenshot buffer
 */
export function hashScreenshot(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Get cached response if available
 */
export function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (cached) {
    console.log('✓ Cache hit for query:', cacheKey.slice(0, 8));
    return cached.response;
  }
  return null;
}

/**
 * Store response in cache
 */
export function cacheResponse(
  cacheKey: string,
  response: string,
  model: string
): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
    model
  });
  console.log('✓ Cached response:', cacheKey.slice(0, 8));
}

/**
 * Clear cache (for testing or manual refresh)
 */
export function clearCache(): void {
  responseCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  console.log('✓ Response cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: responseCache.size,
    max: responseCache.max,
    hitRate: calculateHitRate()
  };
}

// Track hits/misses for analytics
let cacheHits = 0;
let cacheMisses = 0;

function calculateHitRate(): number {
  const total = cacheHits + cacheMisses;
  return total > 0 ? cacheHits / total : 0;
}

// Intercept get to track hits/misses
const originalGet = responseCache.get.bind(responseCache);
(responseCache as any).get = function(key: string) {
  const result = originalGet(key);
  if (result) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  return result;
};
