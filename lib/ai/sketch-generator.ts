/**
 * AI Sketch Generator
 *
 * Generates visual sketches and layouts using Google Gemini 2.5 Flash Image
 * via OpenRouter. Takes a base map screenshot and detailed drawing instructions,
 * returns an annotated image with overlays, labels, and design elements.
 *
 * Two-stage approach:
 * 1. Text AI generates detailed drawing instructions (handled elsewhere)
 * 2. This module uses those instructions + base image → generates sketch
 */

import { openrouter } from './openrouter';
import { getSketchImageModel } from './model-settings';

export interface SketchGenerationOptions {
  baseImageUrl: string;       // Screenshot to draw on (R2 URL or data URI)
  drawingPrompt: string;      // Detailed instructions for what to draw
  aspectRatio?: string;       // Optional: '16:9', '4:3', '1:1'
}

/**
 * Generate a sketch/layout image using Gemini 2.5 Flash Image
 *
 * @param options - Generation parameters
 * @returns Base64 data URI of generated image
 * @throws Error if generation fails or response is invalid
 */
export async function generateSketch(options: SketchGenerationOptions): Promise<string> {
  const { baseImageUrl, drawingPrompt, aspectRatio } = options;

  // Get configured model for sketch image generation
  const imageModel = await getSketchImageModel();

  console.log('[Sketch] Generating image with model:', imageModel);
  console.log('[Sketch] Base image URL length:', baseImageUrl.length);
  console.log('[Sketch] Drawing prompt length:', drawingPrompt.length);

  try {
    // Build message with image input + text prompt
    const completion = await openrouter.chat.completions.create({
      model: imageModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: baseImageUrl } // Base screenshot
            },
            {
              type: 'text',
              text: drawingPrompt // Detailed instructions
            }
          ]
        }
      ],
      max_tokens: 4000,
      // Note: Image generation models may not support all standard parameters
      // Aspect ratio control may vary by model
    });

    console.log('[Sketch] Received response from image model');

    // Extract generated image from response
    // Gemini returns image as part of message content
    const message = completion.choices[0]?.message;

    if (!message?.content) {
      throw new Error('No content in image generation response');
    }

    // Parse multimodal content
    // Content can be string or array of content parts
    let imageUrl: string | null = null;

    if (typeof message.content === 'string') {
      // Fallback: Some models return base64 in text
      const base64Match = message.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        imageUrl = base64Match[0];
        console.log('[Sketch] Extracted image from text response (base64)');
      }
    } else if (Array.isArray(message.content)) {
      // Modern format: Array of content parts
      const contentArray = message.content as any[];
      for (const part of contentArray) {
        if (part.type === 'image_url' && part.image_url?.url) {
          imageUrl = part.image_url.url;
          console.log('[Sketch] Extracted image from content array (image_url)');
          break;
        } else if (part.type === 'image' && part.source?.data) {
          // Some models return base64 in 'image' type
          imageUrl = `data:image/png;base64,${part.source.data}`;
          console.log('[Sketch] Extracted image from content array (image/source)');
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error('[Sketch] Response structure:', JSON.stringify(message, null, 2));
      throw new Error('No image found in generation response');
    }

    console.log('[Sketch] Successfully generated sketch, length:', imageUrl.length);
    return imageUrl; // Returns base64 data URI or URL
  } catch (error: any) {
    console.error('[Sketch] Generation failed:', error.message);
    if (error.response) {
      console.error('[Sketch] Response error:', error.response);
    }
    throw new Error(`Sketch generation failed: ${error.message}`);
  }
}

/**
 * Validate that a URL or data URI is a valid image
 *
 * @param imageUrl - URL or data URI to validate
 * @returns true if valid image format
 */
export function isValidImageUrl(imageUrl: string): boolean {
  // Check for data URI
  if (imageUrl.startsWith('data:image/')) {
    return true;
  }

  // Check for HTTP(S) URL ending in image extension
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  return imageUrl.startsWith('http') && imageExtensions.test(imageUrl);
}
