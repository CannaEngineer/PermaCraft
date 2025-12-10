/**
 * Document Processor
 * Extracts text from PDFs and splits into semantic chunks for embedding
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { db } from '@/lib/db';
import { openrouter, FREE_VISION_MODEL, FALLBACK_VISION_MODEL } from '@/lib/ai/openrouter';

export interface DocumentChunk {
  text: string;
  pageNumber?: number;
  chunkIndex: number;
  metadata?: {
    startChar: number;
    endChar: number;
    wordCount: number;
  };
}

export interface ProcessedDocument {
  totalPages: number;
  totalChunks: number;
  chunks: DocumentChunk[];
  extractionErrors?: string[];
}

const CHUNK_SIZE = 1000; // Target characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks to preserve context
const MIN_CHUNK_SIZE = 100; // Don't create tiny chunks

/**
 * Perform OCR on an image with automatic fallback through multiple models
 * Tries: Free model → Paid model 1 → Paid model 2
 */
async function performOCR(
  imageBase64: string,
  fallbackLevel: number = 0
): Promise<string> {
  const FALLBACK_MODELS = [
    FREE_VISION_MODEL,                    // Try free first
    'google/gemini-2.0-flash-exp:free',   // Another free option
    'google/gemini-flash-1.5',            // Paid fallback 1
    'openai/gpt-4o-mini',                 // Paid fallback 2
  ];

  const model = FALLBACK_MODELS[Math.min(fallbackLevel, FALLBACK_MODELS.length - 1)];
  const isFreeModel = model.includes(':free') || fallbackLevel === 0;

  try {
    const response = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract all text from this document page. Return ONLY the text content, preserving structure and formatting. Do not add any commentary or descriptions.',
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    // Check if it's a rate limit error (429) and we have more fallbacks
    if (error.status === 429 && fallbackLevel < FALLBACK_MODELS.length - 1) {
      const nextModel = FALLBACK_MODELS[fallbackLevel + 1];
      console.log(`    ⚠ ${isFreeModel ? 'Free' : 'Paid'} model rate limit hit, trying ${nextModel}...`);
      // Retry with next fallback model
      return performOCR(imageBase64, fallbackLevel + 1);
    }
    // Re-throw if no more fallbacks
    throw error;
  }
}

/**
 * Check which pages have already been processed for this document
 */
async function getProcessedPages(sourceId: string): Promise<Set<number>> {
  const result = await db.execute({
    sql: 'SELECT DISTINCT page_number FROM knowledge_chunks WHERE source_id = ? AND page_number IS NOT NULL',
    args: [sourceId],
  });

  const processedPages = new Set<number>();
  for (const row of result.rows) {
    if (row.page_number) {
      processedPages.add(row.page_number as number);
    }
  }

  return processedPages;
}

/**
 * Save text for a single page as chunks (incremental saving)
 */
async function savePageChunks(
  sourceId: string,
  pageNumber: number,
  pageText: string,
  startingChunkIndex: number
): Promise<number> {
  if (!pageText || pageText.trim().length === 0) {
    return startingChunkIndex;
  }

  const chunks = chunkText(pageText, pageNumber);
  let savedCount = 0;

  for (const chunk of chunks) {
    try {
      const chunkHash = crypto
        .createHash('sha256')
        .update(chunk.text)
        .digest('hex');

      await db.execute({
        sql: `
          INSERT INTO knowledge_chunks (
            id, source_id, chunk_index, page_number, chunk_text, chunk_hash
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          crypto.randomUUID(),
          sourceId,
          startingChunkIndex + savedCount,
          pageNumber,
          chunk.text,
          chunkHash,
        ],
      });
      savedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to save chunk for page ${pageNumber}:`, error);
    }
  }

  return startingChunkIndex + savedCount;
}

/**
 * Extract text from PDF file using OpenRouter OCR (vision model)
 * Uses pdftoppm to convert PDF to images, then OCR with OpenRouter
 *
 * SUPPORTS INCREMENTAL PROCESSING:
 * - Checks which pages are already processed
 * - Skips already-processed pages
 * - Saves chunks for each page immediately after OCR
 * - Can resume from where it left off if credits run out
 */
export async function extractTextFromPDF(
  filepath: string,
  sourceId: string,
  maxPages: number = 999 // Process full documents (was 3 for testing)
): Promise<{
  text: string;
  numPages: number;
  pageTexts: Map<number, string>;
  newPagesProcessed: number;
  skippedPages: number;
}> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ocr-'));

  try {
    // Get number of pages first
    const pdfInfo = execSync(`pdfinfo "${filepath}"`, { encoding: 'utf-8' });
    const pageMatch = pdfInfo.match(/Pages:\s+(\d+)/);
    const numPages = pageMatch ? parseInt(pageMatch[1]) : 0;

    if (numPages === 0) {
      throw new Error('Could not determine number of pages in PDF');
    }

    const pagesToProcess = Math.min(numPages, maxPages);
    console.log(`  ✓ PDF has ${numPages} page(s), processing up to ${pagesToProcess}`);

    // Check which pages are already processed
    const processedPages = await getProcessedPages(sourceId);
    if (processedPages.size > 0) {
      console.log(`  ✓ Found ${processedPages.size} already-processed pages - will resume from where we left off`);
    }

    // Convert PDF pages to PNG images (only the pages we need)
    const outputPrefix = path.join(tempDir, 'page');
    execSync(`pdftoppm -png -r 150 -l ${pagesToProcess} "${filepath}" "${outputPrefix}"`, {
      stdio: 'pipe',
    });

    // Debug: List actual files created
    const createdFiles = fs.readdirSync(tempDir);
    console.log(`  ✓ Converted ${pagesToProcess} page(s) to images`);
    console.log(`  📁 Files in ${tempDir}:`, createdFiles);

    const pageTexts = new Map<number, string>();
    const allTextParts: string[] = [];
    let chunkIndex = 0;
    let newPagesProcessed = 0;
    let skippedPages = 0;

    // Process each page image with OCR
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      try {
        // Skip pages that are already processed
        if (processedPages.has(pageNum)) {
          console.log(`  ○ Page ${pageNum}/${numPages} already processed, skipping`);
          skippedPages++;
          continue;
        }

        // pdftoppm output naming varies based on total pages:
        // 1-9 pages: page-1.png, page-2.png
        // 10-99 pages: page-01.png, page-02.png
        // 100+ pages: page-001.png, page-002.png
        // We need to determine the padding based on total pages
        const numDigits = String(numPages).length;
        const paddedNum = String(pageNum).padStart(numDigits, '0');
        const imageFile = `${outputPrefix}-${paddedNum}.png`;

        if (!fs.existsSync(imageFile)) {
          console.log(`  ⚠ Image file not found: ${imageFile}`);
          console.log(`  📋 Expected: ${path.basename(imageFile)}, Available:`, createdFiles.filter(f => f.endsWith('.png')));
          continue;
        }

        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(imageFile);
        const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        // Send to OpenRouter vision model for OCR (with automatic fallback to paid model)
        console.log(`  📸 OCR processing page ${pageNum}/${numPages}...`);

        const pageText = await performOCR(imageBase64);

        if (pageText.trim().length > 0) {
          pageTexts.set(pageNum, pageText);
          allTextParts.push(pageText);
          console.log(`    ✓ Extracted ${pageText.length} characters`);

          // SAVE CHUNKS IMMEDIATELY after successful OCR
          chunkIndex = await savePageChunks(sourceId, pageNum, pageText, chunkIndex);
          console.log(`    ✓ Saved chunks for page ${pageNum} to database`);

          newPagesProcessed++;
        } else {
          console.log(`    ⚠ No text extracted from page ${pageNum}`);
        }

      } catch (error) {
        console.error(`  ✗ Error processing page ${pageNum}:`, error);
        // Continue with other pages even if one fails
      }
    }

    const fullText = allTextParts.join('\n\n');

    console.log(`  ✅ Processing summary: ${newPagesProcessed} new pages, ${skippedPages} skipped (already done)`);

    return {
      text: fullText,
      numPages,
      pageTexts,
      newPagesProcessed,
      skippedPages,
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
  }
}

/**
 * Split text into semantic chunks with overlap
 * Tries to respect sentence and paragraph boundaries
 */
export function chunkText(text: string, pageNumber?: number): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Normalize whitespace
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length === 0) {
    return chunks;
  }

  let startPos = 0;
  let chunkIndex = 0;

  while (startPos < normalizedText.length) {
    // Calculate end position
    let endPos = Math.min(startPos + CHUNK_SIZE, normalizedText.length);

    // If not at the end, try to find a good breaking point
    if (endPos < normalizedText.length) {
      // Try to break at sentence boundary (. ! ?)
      const sentenceEnd = findLastSentenceEnd(normalizedText, startPos, endPos);
      if (sentenceEnd > startPos + MIN_CHUNK_SIZE) {
        endPos = sentenceEnd;
      } else {
        // Try to break at word boundary
        const wordEnd = normalizedText.lastIndexOf(' ', endPos);
        if (wordEnd > startPos + MIN_CHUNK_SIZE) {
          endPos = wordEnd;
        }
      }
    }

    // Extract chunk
    const chunkText = normalizedText.slice(startPos, endPos).trim();

    if (chunkText.length >= MIN_CHUNK_SIZE || startPos + chunkText.length >= normalizedText.length) {
      const wordCount = chunkText.split(/\s+/).length;

      chunks.push({
        text: chunkText,
        pageNumber,
        chunkIndex,
        metadata: {
          startChar: startPos,
          endChar: endPos,
          wordCount,
        },
      });

      chunkIndex++;
    }

    // Move start position forward, with overlap
    startPos = endPos - CHUNK_OVERLAP;

    // Ensure we make progress even if chunks are small
    const lastChunkStart = chunks[chunks.length - 1]?.metadata?.startChar;
    if (lastChunkStart !== undefined && startPos <= lastChunkStart) {
      startPos = endPos;
    }
  }

  return chunks;
}

/**
 * Find the last sentence ending (. ! ?) before maxPos
 */
function findLastSentenceEnd(text: string, startPos: number, maxPos: number): number {
  const searchText = text.slice(startPos, maxPos);
  const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

  let lastEnd = -1;

  for (const ending of sentenceEndings) {
    const pos = searchText.lastIndexOf(ending);
    if (pos > lastEnd) {
      lastEnd = pos + ending.length;
    }
  }

  return lastEnd > 0 ? startPos + lastEnd : -1;
}

/**
 * Process a PDF document and save chunks to database
 *
 * SUPPORTS INCREMENTAL PROCESSING:
 * - Chunks are saved as each page is processed
 * - If processing stops (credits run out), progress is saved
 * - Re-running will resume from last completed page
 */
export async function processDocument(
  sourceId: string,
  filepath: string
): Promise<ProcessedDocument> {
  const errors: string[] = [];

  try {
    // Extract text from PDF with incremental saving
    console.log(`📄 Extracting text from ${filepath}...`);
    const { text, numPages, pageTexts, newPagesProcessed, skippedPages } = await extractTextFromPDF(filepath, sourceId);

    console.log(`  ✓ Extracted ${text.length} characters (${newPagesProcessed} new pages, ${skippedPages} skipped)`);

    // Count total chunks saved
    const chunkCountResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM knowledge_chunks WHERE source_id = ?',
      args: [sourceId],
    });

    const totalChunks = (chunkCountResult.rows[0] as any).count as number;

    // Update source record with chunk count
    const processingStatus = (newPagesProcessed + skippedPages >= numPages) ? 'completed' : 'pending';
    await db.execute({
      sql: `
        UPDATE knowledge_sources
        SET total_chunks = ?, processing_status = ?, total_pages = ?
        WHERE id = ?
      `,
      args: [totalChunks, processingStatus, numPages, sourceId],
    });

    return {
      totalPages: numPages,
      totalChunks: totalChunks,
      chunks: [], // Chunks are already saved incrementally
      extractionErrors: errors.length > 0 ? errors : undefined,
    };

  } catch (error) {
    console.error(`❌ Error processing document:`, error);

    // Update source status to failed
    await db.execute({
      sql: `
        UPDATE knowledge_sources
        SET processing_status = 'failed'
        WHERE id = ?
      `,
      args: [sourceId],
    });

    throw error;
  }
}

/**
 * Process all pending documents in the queue
 */
export async function processQueue(limit: number = 10): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get pending items from queue, including:
    // - 'queued' items
    // - 'processing' items that have been stuck for >5 minutes (stale/crashed)
    // - Items where source status is 'pending' (partial completion that should be resumed)
    const result = await db.execute({
      sql: `
        SELECT
          q.id as queue_id,
          s.id as source_id,
          s.processing_status as source_status,
          q.status as queue_status,
          q.priority,
          q.filename,
          q.file_path,
          q.started_at
        FROM knowledge_processing_queue q
        JOIN knowledge_sources s ON s.filename = q.filename
        WHERE
          q.status = 'queued'
          OR (q.status = 'processing' AND (unixepoch() - q.started_at) > 300)
          OR (q.status = 'processing' AND s.processing_status = 'pending')
        ORDER BY q.priority DESC, q.queued_at ASC
        LIMIT ?
      `,
      args: [limit],
    });

    console.log(`\n📋 Processing ${result.rows.length} documents from queue...`);

    for (const row of result.rows) {
      const queueId = row.queue_id as string;
      const sourceId = row.source_id as string;
      const queueStatus = row.queue_status as string;
      const sourceStatus = row.source_status as string;
      const filename = row.filename as string;
      const filepath = row.file_path as string;

      // Check if this is a resume operation
      const isResume = queueStatus === 'processing' || sourceStatus === 'pending';
      if (isResume) {
        console.log(`\n▶ Resuming: ${filename} (${sourceStatus})`);
      } else {
        console.log(`\n▶ Processing: ${filename}`);
      }

      try {
        // Mark as processing (update timestamp even if already processing)
        await db.execute({
          sql: `UPDATE knowledge_processing_queue SET status = 'processing', started_at = unixepoch() WHERE id = ?`,
          args: [queueId],
        });

        // Process the document (incremental processing will skip completed pages)
        await processDocument(sourceId, filepath);

        // After processing, sync queue status with source status
        const sourceResult = await db.execute({
          sql: 'SELECT processing_status FROM knowledge_sources WHERE id = ?',
          args: [sourceId],
        });

        const finalSourceStatus = sourceResult.rows[0]?.processing_status as string;

        if (finalSourceStatus === 'completed') {
          // Fully completed
          await db.execute({
            sql: `UPDATE knowledge_processing_queue SET status = 'completed', completed_at = unixepoch() WHERE id = ?`,
            args: [queueId],
          });
          processed++;
          console.log(`  ✅ Completed: ${filename}`);
        } else if (finalSourceStatus === 'pending') {
          // Partial completion - leave in processing state but don't count as failure
          await db.execute({
            sql: `UPDATE knowledge_processing_queue SET status = 'processing' WHERE id = ?`,
            args: [queueId],
          });
          console.log(`  ⏸️  Partially complete: ${filename} (will resume later)`);
        } else {
          // Failed or unknown status
          await db.execute({
            sql: `UPDATE knowledge_processing_queue SET status = 'failed', completed_at = unixepoch() WHERE id = ?`,
            args: [queueId],
          });
          failed++;
          console.log(`  ❌ Failed: ${filename}`);
        }

      } catch (error) {
        console.error(`  ❌ Failed: ${filename}`, error);

        // Check if we made any progress (partial completion)
        const chunkCheck = await db.execute({
          sql: 'SELECT COUNT(*) as count FROM knowledge_chunks WHERE source_id = ?',
          args: [sourceId],
        });
        const hasChunks = (chunkCheck.rows[0] as any).count > 0;

        if (hasChunks) {
          // Partial completion - leave in processing state for resume
          await db.execute({
            sql: `UPDATE knowledge_processing_queue SET status = 'processing' WHERE id = ?`,
            args: [queueId],
          });
          console.log(`  ⏸️  Saved partial progress: ${filename} (will resume later)`);
        } else {
          // Complete failure - mark as failed
          await db.execute({
            sql: `
              UPDATE knowledge_processing_queue
              SET status = 'failed',
                  completed_at = unixepoch()
              WHERE id = ?
            `,
            args: [queueId],
          });
          failed++;
        }
      }
    }

    return { processed, failed, skipped };

  } catch (error) {
    console.error('Error processing queue:', error);
    throw error;
  }
}
