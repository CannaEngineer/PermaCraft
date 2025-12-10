/**
 * Embedding Generator
 * Generates vector embeddings for text chunks using OpenRouter (Qwen3)
 */

import { openrouter } from '@/lib/ai/openrouter';

const EMBEDDING_MODEL = 'qwen/qwen3-embedding-8b';
const EMBEDDING_DIMENSIONS = 4096; // Qwen3 embedding dimension (corrected from 8192)
const BATCH_SIZE = 100; // Process chunks in batches

export interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  tokenCount: number;
}

/**
 * Generate embeddings for a batch of text chunks using OpenRouter
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const response = await openrouter.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error}`);
  }
}

/**
 * Process unembedded chunks and generate embeddings
 */
export async function processUnembeddedChunks(
  dbClient: any,
  limit: number = BATCH_SIZE
): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  try {
    // Get chunks without embeddings
    const result = await dbClient.execute({
      sql: `
        SELECT id, chunk_text
        FROM knowledge_chunks
        WHERE embedding IS NULL
        LIMIT ?
      `,
      args: [limit],
    });

    if (result.rows.length === 0) {
      console.log('  ✓ No chunks need embeddings');
      return { processed, failed };
    }

    console.log(`\n🔢 Generating embeddings for ${result.rows.length} chunks...`);

    // Prepare batch
    const chunks = result.rows.map((row: any) => ({
      id: row.id as string,
      text: row.chunk_text as string,
    }));

    const texts = chunks.map((c: { id: string; text: string }) => c.text);

    // Generate embeddings in batch
    const embeddings = await generateEmbeddings(texts);

    // Save embeddings to database
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = embeddings[i];
        const chunkId = chunks[i].id;

        // Convert embedding array to Buffer for SQLite BLOB storage
        const embeddingBuffer = Buffer.from(
          new Float32Array(embedding).buffer
        );

        // Estimate token count (rough approximation: ~4 chars per token)
        const tokenCount = Math.ceil(chunks[i].text.length / 4);

        await dbClient.execute({
          sql: `
            UPDATE knowledge_chunks
            SET embedding = ?,
                embedding_model = ?,
                token_count = ?
            WHERE id = ?
          `,
          args: [embeddingBuffer, EMBEDDING_MODEL, tokenCount, chunkId],
        });

        processed++;
        console.log(`  ✓ Embedded chunk ${i + 1}/${chunks.length}`);
      } catch (error) {
        console.error(`  ✗ Failed to save embedding for chunk:`, error);
        failed++;
      }
    }

    console.log(`\n  ✅ Embeddings complete: ${processed} succeeded, ${failed} failed`);

    return { processed, failed };
  } catch (error) {
    console.error('Error processing unembedded chunks:', error);
    throw error;
  }
}

/**
 * Generate embedding for a single text query (for searching)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openrouter.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error(`Failed to generate query embedding: ${error}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
