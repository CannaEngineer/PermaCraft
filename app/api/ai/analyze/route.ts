/**
 * AI Analysis API Route
 *
 * POST /api/ai/analyze
 *
 * This endpoint powers the core AI-driven permaculture analysis feature.
 * It receives map screenshots and user queries, sends them to OpenRouter's
 * vision models, and returns terrain-aware recommendations.
 *
 * Request Flow:
 * 1. Authenticate user
 * 2. Validate request with Zod schema
 * 3. Verify farm ownership
 * 4. Create or update conversation
 * 5. Build analysis prompt with farm context
 * 6. Upload screenshots to R2 storage (with fallback to base64)
 * 7. Send to OpenRouter vision API (with model fallback)
 * 8. Store analysis in database
 * 9. Return AI response
 *
 * Key Features:
 * - Multi-screenshot support (satellite + topographic views)
 * - Automatic model fallback on rate limits
 * - R2 storage with base64 fallback
 * - Conversation threading for context
 * - Grid coordinate integration for precise location references
 *
 * Performance:
 * - Typical response time: 5-15 seconds
 * - Screenshot upload: 1-3 seconds
 * - AI inference: 3-10 seconds
 * - Free tier rate limits may apply
 */

import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODELS } from "@/lib/ai/openrouter";
import { PERMACULTURE_SYSTEM_PROMPT, createAnalysisPrompt } from "@/lib/ai/prompts";
import { manageConversationContext } from "@/lib/ai/context-manager";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

/**
 * Request Validation Schema
 *
 * Validates incoming analysis requests using Zod.
 *
 * Key fields:
 * - screenshots: Array of {type, data} for multi-view analysis
 * - conversationId: Optional - creates new conversation if omitted
 * - zones: Optional zone data with grid coordinates for AI context
 * - gridCoordinates: Formatted string like "A1-B3" for easy AI consumption
 * - gridCells: Array of individual cells like ["A1", "A2", "B1"] for detailed analysis
 *
 * Why array of screenshots?
 * - Supports dual-view analysis (satellite + topographic)
 * - AI can correlate visual features with terrain data
 * - Future: Could support time-series comparisons
 */
const analyzeSchema = z.object({
  farmId: z.string(),
  conversationId: z.string().optional(), // Optional - will create new if not provided
  query: z.string().min(1),
  screenshots: z.array(z.object({
    type: z.string(), // 'satellite', 'usgs', 'topo', etc.
    data: z.string(), // Base64 data URI
  })),
  mapLayer: z.string().optional(),
  legendContext: z.string().optional(),
  nativeSpeciesContext: z.string().optional(),
  plantingsContext: z.string().optional(),
  zones: z.array(z.object({
    type: z.string(),
    name: z.string(),
    geometryType: z.string().optional(),
    gridCoordinates: z.string().optional(), // e.g., "A1-B3"
    gridCells: z.array(z.string()).optional(), // e.g., ["A1", "A2", "B1"]
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authenticate user
    // Throws 401 if not authenticated
    const session = await requireAuth();

    // STEP 2: Validate request body
    const body = await request.json();
    const { farmId, conversationId, query, screenshots, mapLayer, legendContext, nativeSpeciesContext, plantingsContext, zones } = analyzeSchema.parse(body);

    /**
     * STEP 3: Verify farm ownership
     *
     * Security: Prevent users from analyzing other users' farms
     * This check ensures the authenticated user owns the farm they're analyzing
     */
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    /**
     * STEP 4: Get or create conversation
     *
     * Conversations group related analyses together (like chat threads).
     * This allows users to have multi-turn discussions with the AI about
     * the same farm area.
     *
     * Behavior:
     * - No conversationId provided → Create new conversation with query as title
     * - conversationId provided → Continue existing conversation
     *
     * Database:
     * - ai_conversations table stores conversation metadata
     * - ai_analyses table stores individual messages (linked via conversation_id)
     */
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      // Create new conversation with auto-generated title
      const newConversationId = crypto.randomUUID();
      const conversationTitle = query.length > 50
        ? query.substring(0, 47) + "..." // Truncate long queries
        : query;

      await db.execute({
        sql: `INSERT INTO ai_conversations (id, farm_id, title, created_at, updated_at)
              VALUES (?, ?, ?, unixepoch(), unixepoch())`,
        args: [newConversationId, farmId, conversationTitle],
      });

      activeConversationId = newConversationId;
    } else {
      // Update existing conversation timestamp
      // This keeps conversations sorted by last activity
      await db.execute({
        sql: `UPDATE ai_conversations SET updated_at = unixepoch() WHERE id = ?`,
        args: [activeConversationId],
      });
    }

    // Create analysis prompt with farm and map context
    const userPrompt = createAnalysisPrompt(
      {
        name: farm.name,
        acres: farm.acres || undefined,
        climateZone: farm.climate_zone || undefined,
        rainfallInches: farm.rainfall_inches || undefined,
        soilType: farm.soil_type || undefined,
        centerLat: farm.center_lat,
        centerLng: farm.center_lng,
      },
      query,
      {
        layer: mapLayer,
        screenshots: screenshots,
        zones: zones,
        legendContext: legendContext,
        nativeSpeciesContext: nativeSpeciesContext,
        plantingsContext: plantingsContext,
      }
    );

    /**
     * STEP 6: Upload screenshots to R2 storage
     *
     * Why upload to R2?
     * - Reduces database size (screenshots are ~500KB base64)
     * - Provides permanent URLs for historical analyses
     * - Allows screenshot archival for later review
     *
     * Fallback Strategy:
     * - R2 configured → Upload and use public URL
     * - R2 not configured OR upload fails → Use base64 data directly
     * - Per-screenshot fallback → Some can succeed while others fail
     *
     * This graceful degradation ensures the feature works even without R2.
     *
     * Performance:
     * - R2 upload: ~500ms per screenshot
     * - Base64 fallback: instant (no upload)
     * - AI accepts both URLs and base64 data URIs
     */
    const screenshotUrls: string[] = [];
    try {
      console.log("Uploading screenshots to R2...", {
        screenshotCount: screenshots.length,
        types: screenshots.map(s => s.type),
        hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
      });

      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        try {
          const url = await uploadScreenshot(
            farmId,
            screenshot.data,
            `${screenshot.type}-${i}` // Suffix for uniqueness
          );
          screenshotUrls.push(url);
          console.log(`Screenshot ${i + 1} (${screenshot.type}) uploaded:`, url.substring(0, 100));
        } catch (error) {
          console.error(`Failed to upload screenshot ${i + 1} to R2:`, error);
          // Per-screenshot fallback: use base64 data if R2 upload fails
          screenshotUrls.push(screenshot.data);
          console.log(`Using base64 fallback for screenshot ${i + 1}`);
        }
      }
    } catch (error) {
      console.error("Failed to upload screenshots:", error);
      // Global fallback: use base64 data for all screenshots
      screenshots.forEach(s => screenshotUrls.push(s.data));
    }

    // Verify image data is present
    console.log("AI Analysis Request:", {
      farmId,
      query: query.substring(0, 50) + "...",
      screenshotCount: screenshots.length,
      screenshotTypes: screenshots.map(s => s.type),
      screenshotUrls: screenshotUrls.map(url => url.substring(0, 100)),
      zonesCount: zones?.length || 0,
      mapLayer,
    });

    /**
     * STEP 6.5: Fetch conversation history
     *
     * Load all previous messages from this conversation to provide context.
     * This allows the AI to:
     * - Remember previous questions and answers
     * - Follow up on earlier topics
     * - Build on previous recommendations
     *
     * Message History Structure:
     * - Fetch all ai_analyses for this conversation_id
     * - Build message array: [user_query, ai_response, user_query, ai_response, ...]
     * - Newest messages first (ORDER BY created_at DESC)
     * - Reverse to chronological order for API
     *
     * Note: We only attach screenshots to the CURRENT message, not historical ones
     */
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (activeConversationId) {
      const historyResult = await db.execute({
        sql: `SELECT user_query, ai_response, created_at
              FROM ai_analyses
              WHERE conversation_id = ?
              ORDER BY created_at ASC`,
        args: [activeConversationId]
      });

      // Build message history (alternating user/assistant)
      for (const row of historyResult.rows) {
        conversationHistory.push({
          role: "user",
          content: row.user_query as string
        });
        conversationHistory.push({
          role: "assistant",
          content: row.ai_response as string
        });
      }

      console.log(`Loaded ${conversationHistory.length} messages from conversation history`);

      // Manage context size - compress if too large
      const { managedHistory, wasCompressed, stats } = manageConversationContext(conversationHistory);
      conversationHistory = managedHistory;

      if (wasCompressed) {
        console.log(`🗜️ Compressed conversation history:`, stats);
        console.log(`  - Original: ${stats.originalMessages} messages, ~${stats.originalTokens} tokens`);
        console.log(`  - Compressed: ${stats.finalMessages} messages, ~${stats.finalTokens} tokens`);
        console.log(`  - Savings: ${Math.round((1 - stats.finalTokens / stats.originalTokens) * 100)}%`);
      } else {
        console.log(`✓ Conversation history fits within token budget (${stats.finalTokens} tokens)`);
      }
    }

    /**
     * STEP 7: Call OpenRouter Vision API
     *
     * This is the core AI inference step. We send screenshots and prompts to
     * OpenRouter's vision models which can analyze terrain from map images.
     *
     * Multi-Model Fallback Strategy:
     * - FREE_VISION_MODELS array contains multiple free vision models
     * - Try models in order until one succeeds
     * - On rate limit (429) → Try next model
     * - On unsupported vision → Try next model
     * - On other errors → Throw immediately (bad request, invalid data, etc.)
     *
     * Why fallback?
     * - Free models have aggressive rate limits
     * - Not all models support vision (despite OpenRouter labeling)
     * - Model availability changes (sometimes models go offline)
     *
     * Message Structure:
     * - System message: Permaculture expert persona and instructions
     * - Conversation history: Previous user/assistant messages (text only)
     * - Current user message: Multi-part content with text + images
     *   - Text part: Farm context + user query + grid coordinates
     *   - Image parts: Screenshots (satellite, topographic, etc.)
     *
     * Vision API Format:
     * - Images can be base64 data URIs OR public URLs
     * - Multiple images in single request (multi-view analysis)
     * - Max tokens: 4000 (balance between detail and cost)
     *
     * Performance:
     * - Typical response time: 3-10 seconds
     * - Rate limit errors are common on free tier
     * - Fallback typically succeeds on 1st or 2nd model
     */
    let completion;
    let usedModel = FREE_VISION_MODELS[0];
    let lastError;

    for (const model of FREE_VISION_MODELS) {
      try {
        console.log(`Attempting AI analysis with model: ${model}`);

        /**
         * Build Multi-Part User Content
         *
         * OpenRouter vision API expects an array with:
         * 1. Text part (prompt with farm context)
         * 2. Image parts (one for each screenshot)
         *
         * This allows the AI to see both satellite and topographic views
         * simultaneously and correlate features between them.
         */
        const userContent: any[] = [{ type: "text", text: userPrompt }];

        // Add all screenshot images to the content array
        // Use R2 URLs if available, otherwise use base64 data
        screenshots.forEach((screenshot, idx) => {
          userContent.push({
            type: "image_url",
            image_url: { url: screenshotUrls[idx] }, // R2 URL or base64 fallback
          });
        });

        // Build complete message array with conversation history
        const messages: any[] = [
          {
            role: "system",
            content: PERMACULTURE_SYSTEM_PROMPT, // Sets AI persona and instructions
          },
          // Include conversation history (text-only messages)
          ...conversationHistory,
          // Current message with screenshots
          {
            role: "user",
            content: userContent, // Multi-part: text + images
          },
        ];

        console.log(`Sending ${messages.length} messages to AI (including ${conversationHistory.length} history messages)`);

        // Call OpenRouter API
        completion = await openrouter.chat.completions.create({
          model: model,
          messages: messages,
          max_tokens: 4000, // Allow detailed responses
        });

        usedModel = model;
        console.log(`AI Response received from ${model}:`, {
          hasResponse: !!completion.choices[0]?.message?.content,
          responseLength: completion.choices[0]?.message?.content?.length || 0,
        });
        break; // Success! Exit loop

      } catch (error: any) {
        lastError = error;
        console.error(`Model ${model} failed:`, error?.status, error?.error?.message);

        /**
         * Error Handling and Fallback Logic
         *
         * Rate Limit (429):
         * - Free models have aggressive limits (often 1-5 requests/minute)
         * - Try next model - often succeeds immediately
         *
         * Payload Too Large (413):
         * - Model has smaller context window or payload limits
         * - Try next model which may support larger payloads
         *
         * Model Not Found (404):
         * - Model is no longer available or name has changed
         * - Try next model in the list
         *
         * Unsupported Vision:
         * - Some models advertised as vision-capable don't actually support it
         * - Check error message for 'unsupported' or 'does not support'
         * - Try next model
         *
         * Other Errors:
         * - Bad request (400): Invalid data - throw immediately
         * - Server error (500): OpenRouter issue - throw immediately
         * - These won't be fixed by trying another model
         */
        const isRateLimited = error?.status === 429 || error?.code === 429;
        const isPayloadTooLarge = error?.status === 413 || error?.code === 413;
        const isNotFound = error?.status === 404 || error?.code === 404;
        const isUnsupported = error?.error?.message?.includes('unsupported') ||
                             error?.error?.message?.includes('does not support') ||
                             error?.error?.message?.includes('vision');

        if (isRateLimited) {
          console.log(`Rate limited on ${model}, trying next model...`);
          continue; // Try next model
        } else if (isPayloadTooLarge) {
          console.log(`Payload too large for ${model}, trying next model...`);
          continue; // Try next model
        } else if (isNotFound) {
          console.log(`Model ${model} not found or unavailable, trying next model...`);
          continue; // Try next model
        } else if (isUnsupported) {
          console.log(`Model ${model} doesn't support vision, trying next model...`);
          continue; // Try next model
        } else {
          // For other errors (bad request, server error), throw immediately
          throw error;
        }
      }
    }

    // If we exhausted all models, throw the last error
    if (!completion) {
      console.error("All vision models failed or rate limited");
      throw lastError || new Error("All AI models are currently rate limited. Please try again in a few moments.");
    }

    const response = completion.choices[0]?.message?.content || "No response generated";

    // Prepare zones context as JSON
    const zonesContext = zones ? JSON.stringify(zones) : null;

    // Save analysis to database with R2 URLs as JSON array
    const analysisId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (
              id, farm_id, conversation_id, user_query, screenshot_data,
              map_layer, zones_context, ai_response, model, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        analysisId,
        farmId,
        activeConversationId,
        query,
        JSON.stringify(screenshotUrls), // Store array of R2 URLs as JSON
        mapLayer || "satellite",
        zonesContext,
        response,
        usedModel // Store which model actually responded
      ],
    });

    return Response.json({
      response,
      analysisId,
      conversationId: activeConversationId,
    });
  } catch (error) {
    console.error("AI analysis error:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      return Response.json({
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }

    return Response.json({
      error: "Analysis failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
