/**
 * Client-side AI Analysis Orchestration
 *
 * This module provides a CLIENT-callable function that orchestrates the optimized
 * AI analysis flow. It does NOT perform optimizations directly (those happen in
 * the API route), but it does:
 * - Prepare request data
 * - Check client-side cache (future)
 * - Call the API
 * - Return results with metadata
 *
 * Safe to import in client components.
 */

export interface AnalyzeRequest {
  userQuery: string;
  screenshotDataURL?: string; // Base64 data URL from canvas
  conversationId?: string;
  mapLayer?: string;
  farmContext: {
    zones: any[];
    plantings: any[];
    lines: any[];
    goals: any[];
    nativeSpecies: any[];
    guilds?: any[];
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
  conversationId?: string;
  analysisId?: string;
  generatedImageUrl?: string | null;
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
 *
 * This is a client-callable orchestration function that:
 * 1. Prepares the analysis request data
 * 2. Calls /api/ai/analyze with optimization flags
 * 3. Returns response with optimization metadata
 */
export async function analyzeWithOptimization(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const { userQuery, screenshotDataURL, conversationId, mapLayer, farmContext, farmInfo } = request;

  const result = await callAIAPI({
    query: userQuery,
    context: farmContext,
    screenshot: screenshotDataURL,
    conversationId,
    mapLayer,
    farmInfo
  });

  return result;
}

/**
 * Call AI API with proper formatting
 */
async function callAIAPI(params: {
  query: string;
  context: any;
  screenshot?: string;
  conversationId?: string;
  mapLayer?: string;
  farmInfo: any;
}): Promise<AnalyzeResponse> {
  const screenshots = params.screenshot
    ? [{ type: params.mapLayer || 'screenshot', data: params.screenshot }]
    : [];

  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      farmId: params.farmInfo.id,
      conversationId: params.conversationId,
      screenshots,
      mapLayer: params.mapLayer,
      farmContext: params.context,
      farmInfo: params.farmInfo,
      enableOptimizations: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.message || errorData.error || 'AI API request failed');
  }

  const data = await response.json();

  return {
    response: data.response,
    conversationId: data.conversationId,
    analysisId: data.analysisId,
    generatedImageUrl: data.generatedImageUrl,
    metadata: {
      cached: data.metadata?.cached || false,
      screenshotTokens: data.metadata?.screenshotTokens || 0,
      contextTokens: data.metadata?.contextTokens || 0,
      totalTokens: data.metadata?.totalTokens || 0,
      screenshotSize: data.metadata?.screenshotSize || 0,
      detailLevel: data.metadata?.detailLevel || 'unknown'
    }
  };
}
