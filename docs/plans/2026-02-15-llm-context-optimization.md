# LLM Context Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize the LLM screenshot processing and context assembly system to provide maximum relevant context while minimizing API costs and latency.

**Architecture:** Multi-stage context optimization with smart screenshot downsampling, selective layer capture, semantic compression of farm data, caching strategy, and cost-aware fallbacks.

**Tech Stack:** Sharp (image processing), LRU cache, Anthropic SDK, token counting, compression utilities

---

## Current System Analysis

**Current Implementation:**
- File: `components/immersive-map/immersive-map-editor.tsx:598-645` (handleAnalyze function)
- Screenshot capture: `captureMapScreenshot` in same file
- Context building: Lines 30-150 (buildLegendContext, buildNativeSpeciesContext, buildPlantingsContext, buildGoalsContext)
- API: `app/api/ai/analyze/route.ts`

**Current Issues:**
- Full-resolution screenshots (expensive)
- All context sent every time (redundant)
- No caching of context or responses
- Large base64 images in requests
- Model: `meta-llama/llama-3.2-90b-vision-instruct:free` (good but rate-limited)

**Cost Breakdown (Typical Request):**
- Screenshot: ~500-800KB → ~200K tokens (vision)
- Context text: ~2K tokens
- Response: ~1K tokens
- **Total: ~203K tokens per request**

---

## Task 1: Screenshot Optimization Utility

**Files:**
- Create: `lib/ai/screenshot-optimizer.ts`
- Test: `lib/ai/screenshot-optimizer.test.ts`

**Step 1: Write failing test**

```typescript
// lib/ai/screenshot-optimizer.test.ts
import { describe, test, expect } from '@jest/globals';
import { optimizeScreenshot, getOptimalResolution } from './screenshot-optimizer';
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
});
```

**Step 2: Run test to verify failure**

```bash
npm test -- screenshot-optimizer.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement screenshot optimizer**

```typescript
// lib/ai/screenshot-optimizer.ts
import sharp from 'sharp';

export type DetailLevel = 'low' | 'medium' | 'high';

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100
  format?: 'webp' | 'jpeg' | 'png';
}

export interface OptimizedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Optimize screenshot for LLM vision API
 * Goals: < 200KB, maintain readability, fast processing
 */
export async function optimizeScreenshot(
  imageBuffer: Buffer,
  options: OptimizationOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1280,
    maxHeight = 960,
    quality = 85,
    format = 'webp'
  } = options;

  try {
    let pipeline = sharp(imageBuffer);

    // Get original dimensions
    const metadata = await pipeline.metadata();
    const originalWidth = metadata.width || maxWidth;
    const originalHeight = metadata.height || maxHeight;

    // Calculate resize dimensions (maintain aspect ratio)
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const aspectRatio = originalWidth / originalHeight;

      if (originalWidth > originalHeight) {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / aspectRatio);
      } else {
        targetHeight = maxHeight;
        targetWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Resize
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

    // Convert format and compress
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
    }

    const optimized = await pipeline.toBuffer();

    // If still too large, reduce quality iteratively
    if (optimized.byteLength > 200 * 1024 && quality > 60) {
      return optimizeScreenshot(imageBuffer, {
        ...options,
        quality: quality - 10
      });
    }

    return optimized;
  } catch (error) {
    console.error('Screenshot optimization failed:', error);
    throw error;
  }
}

/**
 * Get optimal resolution based on query detail needs
 */
export function getOptimalResolution(detailLevel: DetailLevel): { width: number; height: number } {
  const resolutions = {
    low: { width: 800, height: 600 },     // General questions, quick analysis
    medium: { width: 1280, height: 960 }, // Detailed design review
    high: { width: 1920, height: 1440 }   // Precise measurements, plant ID
  };
  return resolutions[detailLevel];
}

/**
 * Determine detail level needed based on user query
 */
export function inferDetailLevel(query: string): DetailLevel {
  const lowerQuery = query.toLowerCase();

  // High detail indicators
  if (
    lowerQuery.includes('identify') ||
    lowerQuery.includes('measure') ||
    lowerQuery.includes('exact') ||
    lowerQuery.includes('precise') ||
    lowerQuery.includes('spacing')
  ) {
    return 'high';
  }

  // Low detail indicators
  if (
    lowerQuery.includes('overview') ||
    lowerQuery.includes('general') ||
    lowerQuery.includes('suggest') ||
    lowerQuery.includes('idea')
  ) {
    return 'low';
  }

  // Default to medium
  return 'medium';
}

/**
 * Convert buffer to base64 data URL
 */
export function bufferToDataURL(buffer: Buffer, format: string): string {
  const mimeType = {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    png: 'image/png'
  }[format] || 'image/png';

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Estimate token count for image
 * Vision API tokens ≈ (width * height) / 750
 */
export function estimateImageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}
```

**Step 4: Install sharp dependency**

```bash
npm install sharp
```

**Step 5: Run test to verify pass**

```bash
npm test -- screenshot-optimizer.test.ts
```

Expected: PASS (after creating test fixture)

**Step 6: Commit screenshot optimizer**

```bash
git add lib/ai/screenshot-optimizer.ts lib/ai/screenshot-optimizer.test.ts package.json package-lock.json
git commit -m "feat(ai): add screenshot optimization for LLM API"
```

---

## Task 2: Smart Context Compressor

**Files:**
- Create: `lib/ai/context-compressor.ts`

**Step 1: Create context compression utility**

```typescript
// lib/ai/context-compressor.ts
export interface FarmContext {
  zones: any[];
  plantings: any[];
  lines: any[];
  goals: any[];
  nativeSpecies: any[];
}

export interface CompressedContext {
  summary: string;
  keyFacts: string[];
  plantingsList: string;
  nativeSpeciesList: string;
  goals: string;
  tokenEstimate: number;
}

/**
 * Compress farm context to essential information
 * Target: < 2000 tokens for context
 */
export function compressFarmContext(
  context: FarmContext,
  verbosity: 'minimal' | 'standard' | 'detailed' = 'standard'
): CompressedContext {
  const { zones, plantings, lines, goals, nativeSpecies } = context;

  // Summary statistics
  const summary = `Farm: ${zones.length} zones, ${plantings.length} plantings, ${lines.length} water features`;

  // Key facts (most important info first)
  const keyFacts: string[] = [];

  // Count by layer
  const layerCounts: Record<string, number> = {};
  plantings.forEach(p => {
    layerCounts[p.layer] = (layerCounts[p.layer] || 0) + 1;
  });

  Object.entries(layerCounts).forEach(([layer, count]) => {
    keyFacts.push(`${count} ${layer} layer plants`);
  });

  // Function coverage
  const functionCounts: Record<string, number> = {};
  plantings.forEach(p => {
    if (p.permaculture_functions) {
      try {
        const functions = JSON.parse(p.permaculture_functions);
        functions.forEach((fn: string) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
      } catch {}
    }
  });

  // Highlight gaps (important functions with 0 count)
  const criticalFunctions = ['nitrogen_fixer', 'pollinator_support', 'edible_fruit'];
  criticalFunctions.forEach(fn => {
    if (!functionCounts[fn]) {
      keyFacts.push(`⚠️ No ${fn.replace(/_/g, ' ')}`);
    }
  });

  // Plantings list (compressed)
  let plantingsList: string;
  if (verbosity === 'minimal') {
    // Just species names and counts
    const speciesCounts: Record<string, number> = {};
    plantings.forEach(p => {
      speciesCounts[p.common_name] = (speciesCounts[p.common_name] || 0) + 1;
    });
    plantingsList = Object.entries(speciesCounts)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
  } else if (verbosity === 'detailed') {
    // Full details
    plantingsList = plantings.map(p =>
      `${p.common_name} (${p.scientific_name}): ${p.layer}, planted ${p.planted_year}`
    ).join('\n');
  } else {
    // Standard: key info only
    plantingsList = plantings.map(p =>
      `${p.common_name}: ${p.layer}, year ${p.planted_year || 'unknown'}`
    ).join('\n');
  }

  // Native species (top 10 by relevance)
  const topNatives = nativeSpecies.slice(0, 10);
  nativeSpeciesList = topNatives.map(s =>
    `${s.common_name} (${s.layer}, ${s.mature_height_ft}ft)`
  ).join(', ');

  // Goals (if any)
  const goalsText = goals.length > 0
    ? goals.map(g => `${g.goal_category}: ${g.description}`).join('; ')
    : 'No goals set';

  // Estimate tokens (rough)
  const text = `${summary}\n${keyFacts.join('\n')}\n${plantingsList}\n${nativeSpeciesList}\n${goalsText}`;
  const tokenEstimate = Math.ceil(text.length / 4); // ~4 chars per token

  return {
    summary,
    keyFacts,
    plantingsList,
    nativeSpeciesList,
    goals: goalsText,
    tokenEstimate
  };
}

/**
 * Build optimized context string for LLM
 */
export function buildOptimizedContext(
  compressed: CompressedContext,
  userQuery: string
): string {
  // Analyze query to determine what context to include
  const needsPlantings = /plant|tree|species|guild/i.test(userQuery);
  const needsNatives = /native|recommend|suggest|add/i.test(userQuery);
  const needsGoals = /goal|objective|plan|timeline/i.test(userQuery);

  const parts: string[] = [compressed.summary];

  if (compressed.keyFacts.length > 0) {
    parts.push('\nKey facts:\n- ' + compressed.keyFacts.join('\n- '));
  }

  if (needsPlantings && compressed.plantingsList) {
    parts.push('\nCurrent plantings:\n' + compressed.plantingsList);
  }

  if (needsNatives && compressed.nativeSpeciesList) {
    parts.push('\nNative species available:\n' + compressed.nativeSpeciesList);
  }

  if (needsGoals && compressed.goals) {
    parts.push('\nFarmer goals: ' + compressed.goals);
  }

  return parts.join('\n\n');
}
```

**Step 2: Commit context compressor**

```bash
git add lib/ai/context-compressor.ts
git commit -m "feat(ai): add smart context compression"
```

---

## Task 3: Response Caching Layer

**Files:**
- Create: `lib/ai/response-cache.ts`

**Step 1: Implement LRU cache for responses**

```typescript
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
```

**Step 2: Install lru-cache**

```bash
npm install lru-cache
```

**Step 3: Commit response cache**

```bash
git add lib/ai/response-cache.ts package.json package-lock.json
git commit -m "feat(ai): add response caching layer"
```

---

## Task 4: Optimized Analyze Handler

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx:598-645`
- Create: `lib/ai/optimized-analyze.ts`

**Step 1: Extract analysis logic to utility**

```typescript
// lib/ai/optimized-analyze.ts
import { optimizeScreenshot, inferDetailLevel, bufferToDataURL, estimateImageTokens, getOptimalResolution } from './screenshot-optimizer';
import { compressFarmContext, buildOptimizedContext } from './context-compressor';
import { generateCacheKey, hashContext, hashScreenshot, getCachedResponse, cacheResponse } from './response-cache';

export interface AnalyzeRequest {
  userQuery: string;
  screenshotBuffer?: Buffer;
  farmContext: {
    zones: any[];
    plantings: any[];
    lines: any[];
    goals: any[];
    nativeSpecies: any[];
  };
  farmInfo: {
    id: string;
    climate_zone: string | null;
    rainfall_inches: number | null;
    soil_type: string | null;
  };
}

export interface AnalyzeResponse {
  response: string;
  metadata: {
    cached: boolean;
    screenshotTokens: number;
    contextTokens: number;
    totalTokens: number;
    screenshotSize: number;
    detailLevel: string;
  };
}

/**
 * Optimized AI analysis with caching and compression
 */
export async function analyzeWithOptimization(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const { userQuery, screenshotBuffer, farmContext, farmInfo } = request;

  // 1. Determine detail level needed
  const detailLevel = inferDetailLevel(userQuery);
  console.log('Detail level:', detailLevel);

  // 2. Compress context
  const verbosity = detailLevel === 'high' ? 'detailed' : detailLevel === 'low' ? 'minimal' : 'standard';
  const compressed = compressFarmContext(farmContext, verbosity);
  const contextText = buildOptimizedContext(compressed, userQuery);

  console.log('Context compressed:', compressed.tokenEstimate, 'tokens');

  // 3. Optimize screenshot if provided
  let screenshotDataURL: string | undefined;
  let screenshotTokens = 0;
  let screenshotSize = 0;
  let screenshotHash: string | undefined;

  if (screenshotBuffer) {
    const resolution = getOptimalResolution(detailLevel);
    const optimized = await optimizeScreenshot(screenshotBuffer, {
      maxWidth: resolution.width,
      maxHeight: resolution.height,
      quality: detailLevel === 'high' ? 90 : 80,
      format: 'webp'
    });

    screenshotSize = optimized.byteLength;
    screenshotDataURL = bufferToDataURL(optimized, 'webp');
    screenshotTokens = estimateImageTokens(resolution.width, resolution.height);
    screenshotHash = hashScreenshot(optimized);

    console.log('Screenshot optimized:', screenshotSize, 'bytes,', screenshotTokens, 'tokens');
  }

  // 4. Check cache
  const contextHash = hashContext({ contextText, farmInfo });
  const cacheKey = generateCacheKey(userQuery, contextHash, screenshotHash);
  const cached = getCachedResponse(cacheKey);

  if (cached) {
    return {
      response: cached,
      metadata: {
        cached: true,
        screenshotTokens,
        contextTokens: compressed.tokenEstimate,
        totalTokens: screenshotTokens + compressed.tokenEstimate,
        screenshotSize,
        detailLevel
      }
    };
  }

  // 5. Call AI API
  const response = await callAIAPI({
    query: userQuery,
    context: contextText,
    screenshot: screenshotDataURL,
    farmInfo
  });

  // 6. Cache response
  cacheResponse(cacheKey, response, 'llama-3.2-90b-vision');

  return {
    response,
    metadata: {
      cached: false,
      screenshotTokens,
      contextTokens: compressed.tokenEstimate,
      totalTokens: screenshotTokens + compressed.tokenEstimate,
      screenshotSize,
      detailLevel
    }
  };
}

async function callAIAPI(params: {
  query: string;
  context: string;
  screenshot?: string;
  farmInfo: any;
}): Promise<string> {
  // Call existing analyze API
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('AI API request failed');
  }

  const data = await response.json();
  return data.response;
}
```

**Step 2: Update handleAnalyze to use optimized version**

```tsx
// In immersive-map-editor.tsx:
import { analyzeWithOptimization } from '@/lib/ai/optimized-analyze';

const handleAnalyze = useCallback(async (userQuery: string) => {
  try {
    setAnalyzing(true);

    // Capture screenshot (existing code)
    const screenshot = await captureMapScreenshot(...);

    // Convert data URL to buffer
    const base64 = screenshot.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    // Use optimized analysis
    const result = await analyzeWithOptimization({
      userQuery,
      screenshotBuffer: buffer,
      farmContext: {
        zones,
        plantings,
        lines,
        goals,
        nativeSpecies
      },
      farmInfo: {
        id: farm.id,
        climate_zone: farm.climate_zone,
        rainfall_inches: farm.rainfall_inches,
        soil_type: farm.soil_type
      }
    });

    console.log('Analysis metadata:', result.metadata);

    // Show toast with metadata
    if (result.metadata.cached) {
      toast({
        title: 'Analysis complete (cached)',
        description: `Saved ${result.metadata.totalTokens} tokens`
      });
    } else {
      toast({
        title: 'Analysis complete',
        description: `${result.metadata.screenshotSize} bytes, ${result.metadata.totalTokens} tokens`
      });
    }

    return result.response;
  } catch (error) {
    console.error('Analysis failed:', error);
    toast({
      title: 'Analysis failed',
      description: error.message,
      variant: 'destructive'
    });
  } finally {
    setAnalyzing(false);
  }
}, [/* deps */]);
```

**Step 3: Commit optimized analyzer**

```bash
git add lib/ai/optimized-analyze.ts components/immersive-map/immersive-map-editor.tsx
git commit -m "feat(ai): integrate optimized analysis pipeline"
```

---

## Task 5: Cost Analytics Dashboard

**Files:**
- Create: `components/ai/cost-analytics.tsx`

**Step 1: Create analytics component**

```tsx
// components/ai/cost-analytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getCacheStats } from '@/lib/ai/response-cache';

export function CostAnalytics() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    cachedRequests: 0,
    avgTokensPerRequest: 0,
    avgImageSize: 0,
    cacheHitRate: 0
  });

  useEffect(() => {
    const cacheStats = getCacheStats();
    // Fetch from API or calculate from local storage
    setStats({
      totalRequests: 0,
      cachedRequests: cacheStats.size,
      avgTokensPerRequest: 0,
      avgImageSize: 0,
      cacheHitRate: cacheStats.hitRate
    });
  }, []);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">AI Cost Analytics</h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Cache hit rate</div>
          <div className="text-lg font-bold text-green-600">
            {(stats.cacheHitRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Cached responses</div>
          <div className="text-lg font-bold">{stats.cachedRequests}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg tokens</div>
          <div className="text-lg font-bold">{stats.avgTokensPerRequest}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg image</div>
          <div className="text-lg font-bold">
            {(stats.avgImageSize / 1024).toFixed(0)}KB
          </div>
        </div>
      </div>
    </Card>
  );
}
```

**Step 2: Commit analytics**

```bash
git add components/ai/cost-analytics.tsx
git commit -m "feat(ai): add cost analytics dashboard"
```

---

## Testing Checklist

- [ ] Screenshots optimized to < 200KB
- [ ] Context compressed to < 2K tokens
- [ ] Cache hit on identical queries
- [ ] Detail level inferred correctly
- [ ] Token estimates accurate
- [ ] Performance: analysis < 3s with cache
- [ ] Cost: 75% reduction in tokens

---

## Success Metrics

- **Cost reduction:** 75% fewer tokens per request
- **Cache hit rate:** >40% within first week
- **Latency:** <2s for cached, <5s for new
- **Quality:** User satisfaction unchanged (>4.5/5)
- **Image size:** Avg <150KB (down from 600KB)
