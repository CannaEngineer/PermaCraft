import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODELS } from "@/lib/ai/openrouter";
import { PERMACULTURE_SYSTEM_PROMPT, createAnalysisPrompt } from "@/lib/ai/prompts";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

const analyzeSchema = z.object({
  farmId: z.string(),
  conversationId: z.string().optional(), // Optional - will create new if not provided
  query: z.string().min(1),
  imageData: z.string(), // Base64 data URI
  mapLayer: z.string().optional(),
  zones: z.array(z.object({
    type: z.string(),
    name: z.string(),
    geometryType: z.string().optional(),
    gridCoordinates: z.string().optional(),
    gridCells: z.array(z.string()).optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, conversationId, query, imageData, mapLayer, zones } = analyzeSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    // Get or create conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      // Create new conversation with auto-generated title
      const newConversationId = crypto.randomUUID();
      const conversationTitle = query.length > 50
        ? query.substring(0, 47) + "..."
        : query;

      await db.execute({
        sql: `INSERT INTO ai_conversations (id, farm_id, title, created_at, updated_at)
              VALUES (?, ?, ?, unixepoch(), unixepoch())`,
        args: [newConversationId, farmId, conversationTitle],
      });

      activeConversationId = newConversationId;
    } else {
      // Update existing conversation timestamp
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
        zones: zones,
      }
    );

    // Upload screenshot to R2 storage
    let screenshotUrl: string;
    try {
      console.log("Uploading screenshot to R2...", {
        hasImageData: !!imageData,
        imageDataLength: imageData.length,
        imageDataStart: imageData.substring(0, 50),
        hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
      });
      screenshotUrl = await uploadScreenshot(farmId, imageData, mapLayer || "satellite");
      console.log("Screenshot uploaded successfully:", {
        url: screenshotUrl.substring(0, 100),
        isBase64: screenshotUrl.startsWith('data:'),
      });
    } catch (error) {
      console.error("Failed to upload screenshot to R2:", error);
      // Fallback: use base64 data if R2 upload fails
      screenshotUrl = imageData;
      console.log("Using base64 fallback for screenshot storage");
    }

    // Verify image data is present
    console.log("AI Analysis Request:", {
      farmId,
      query: query.substring(0, 50) + "...",
      hasImage: !!imageData,
      imageSize: imageData.length,
      screenshotUrl: screenshotUrl.substring(0, 100),
      zonesCount: zones?.length || 0,
      mapLayer,
    });

    // Call OpenRouter with base64 image data - try models with fallback on rate limit
    let completion;
    let usedModel = FREE_VISION_MODELS[0];
    let lastError;

    for (const model of FREE_VISION_MODELS) {
      try {
        console.log(`Attempting AI analysis with model: ${model}`);

        completion = await openrouter.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: PERMACULTURE_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageData } },
              ],
            },
          ],
          max_tokens: 4000,
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

        // If rate limited (429) or unsupported content/modality, try next model
        const isRateLimited = error?.status === 429 || error?.code === 429;
        const isUnsupported = error?.error?.message?.includes('unsupported') ||
                             error?.error?.message?.includes('does not support') ||
                             error?.error?.message?.includes('vision');

        if (isRateLimited) {
          console.log(`Rate limited on ${model}, trying next model...`);
          continue;
        } else if (isUnsupported) {
          console.log(`Model ${model} doesn't support vision, trying next model...`);
          continue;
        } else {
          // For other errors, throw immediately
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

    // Save analysis to database with R2 URL (not base64 data)
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
        screenshotUrl, // Store R2 URL instead of base64
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
