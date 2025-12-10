/**
 * Semantic Search
 * Search knowledge base using vector embeddings
 */

import { generateQueryEmbedding, cosineSimilarity } from './embedding-generator';

export interface SearchResult {
  chunkId: string;
  chunkText: string;
  pageNumber: number | null;
  sourceId: string;
  sourceFilename: string;
  sourceTitle: string;
  similarity: number;
  chunkIndex: number;
}

/**
 * Search knowledge base using semantic similarity
 */
export async function semanticSearch(
  dbClient: any,
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<SearchResult[]> {
  try {
    console.log(`🔍 Searching for: "${query}"`);

    // Generate embedding for the query
    console.log('  📊 Generating query embedding...');
    const queryEmbedding = await generateQueryEmbedding(query);

    // Get all chunks with embeddings from database
    console.log('  📚 Fetching knowledge chunks...');
    const result = await dbClient.execute({
      sql: `
        SELECT
          kc.id,
          kc.chunk_text,
          kc.page_number,
          kc.chunk_index,
          kc.embedding,
          ks.id as source_id,
          ks.filename,
          ks.title
        FROM knowledge_chunks kc
        JOIN knowledge_sources ks ON ks.id = kc.source_id
        WHERE kc.embedding IS NOT NULL
      `,
      args: [],
    });

    if (result.rows.length === 0) {
      console.log('  ⚠ No embedded chunks found in database');
      return [];
    }

    console.log(`  ✓ Found ${result.rows.length} chunks with embeddings`);

    // Calculate similarity for each chunk
    console.log('  🧮 Calculating similarities...');
    const results: SearchResult[] = [];

    for (const row of result.rows) {
      try {
        // Convert BLOB to Float32Array
        // Turso returns embeddings as Uint8Array, need to reinterpret as Float32Array
        const embeddingBytes = row.embedding as Uint8Array;
        const embeddingBuffer = Buffer.from(embeddingBytes);
        const chunkEmbedding: number[] = [];

        // Read 4 bytes at a time and convert to float
        for (let i = 0; i < embeddingBuffer.length; i += 4) {
          chunkEmbedding.push(embeddingBuffer.readFloatLE(i));
        }

        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

        // Only include results above minimum similarity
        if (similarity >= minSimilarity) {
          results.push({
            chunkId: row.id as string,
            chunkText: row.chunk_text as string,
            pageNumber: row.page_number as number | null,
            sourceId: row.source_id as string,
            sourceFilename: row.filename as string,
            sourceTitle: row.title as string,
            similarity,
            chunkIndex: row.chunk_index as number,
          });
        }
      } catch (error) {
        console.error('  ✗ Error processing chunk:', error);
        // Continue with other chunks
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K results
    const topResults = results.slice(0, topK);

    console.log(`  ✅ Found ${topResults.length} relevant chunks`);
    topResults.forEach((result, i) => {
      console.log(
        `    ${i + 1}. ${result.sourceFilename} (page ${result.pageNumber || '?'}) - ${(result.similarity * 100).toFixed(1)}% match`
      );
    });

    return topResults;
  } catch (error) {
    console.error('Error in semantic search:', error);
    throw new Error(`Semantic search failed: ${error}`);
  }
}

/**
 * Format search results for AI context
 */
export function formatResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant information found in the knowledge base.';
  }

  const context = results
    .map((result, i) => {
      const pageInfo = result.pageNumber ? ` - Page ${result.pageNumber}` : '';
      const similarity = `${(result.similarity * 100).toFixed(0)}% relevant`;

      return `
[Source ${i + 1}: "${result.sourceTitle}"${pageInfo} (${similarity})]
${result.chunkText}
`.trim();
    })
    .join('\n\n---\n\n');

  return `
Here is relevant information from the permaculture knowledge base:

${context}

IMPORTANT: When citing these sources in your response, be SPECIFIC:
- Use the format: "According to [Source Title] (Page X)..."
- Example: "According to Permaculture: A Designer's Manual (Page 42)..."
- Include the book title and page number in your citations, not just "Source 1"
- This helps users find and verify the information in their own copies
`.trim();
}

/**
 * Search and format results in one step
 */
export async function searchAndFormat(
  dbClient: any,
  query: string,
  topK: number = 5
): Promise<string> {
  const results = await semanticSearch(dbClient, query, topK);
  return formatResultsForAI(results);
}
