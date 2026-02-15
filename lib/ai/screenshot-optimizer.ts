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
