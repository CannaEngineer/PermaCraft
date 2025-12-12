/**
 * RAG Context Provider
 * Retrieves relevant knowledge from the permaculture knowledge base
 */

import { db } from '@/lib/db';
import { semanticSearch } from '@/lib/rag/semantic-search';

export interface KnowledgeChunk {
  chunkId: string;
  chunkText: string;
  pageNumber: number | null;
  sourceFilename: string;
  sourceTitle: string;
  chunkIndex: number;
}

/**
 * Get RAG context for AI prompts using semantic search
 *
 * Uses vector embeddings to find the most relevant knowledge chunks
 * based on semantic similarity to the user's query.
 *
 * @param query - User's question used for semantic search
 * @param topK - Number of chunks to return (default: 5)
 */
export async function getRAGContext(
  query: string,
  topK: number = 5
): Promise<string> {
  try {
    console.log(`🔍 Retrieving knowledge base context for query: "${query.substring(0, 50)}..."`);

    // Use semantic search to find relevant chunks
    const searchResults = await semanticSearch(db, query, topK, 0.5);

    if (searchResults.length === 0) {
      console.log('  ⚠ No relevant knowledge chunks found');
      // Fallback: get any chunks if semantic search fails
      const fallbackResult = await db.execute({
        sql: `
          SELECT
            kc.id,
            kc.chunk_text,
            kc.page_number,
            kc.chunk_index,
            ks.id as source_id,
            ks.filename,
            ks.title
          FROM knowledge_chunks kc
          JOIN knowledge_sources ks ON ks.id = kc.source_id
          WHERE kc.embedding IS NOT NULL
          ORDER BY ks.title, kc.chunk_index
          LIMIT ?
        `,
        args: [topK],
      });

      if (fallbackResult.rows.length === 0) {
        console.log('  ⚠ No knowledge chunks found in database');
        return '';
      }

      const fallbackChunks: KnowledgeChunk[] = fallbackResult.rows.map(row => ({
        chunkId: row.id as string,
        chunkText: row.chunk_text as string,
        pageNumber: row.page_number as number | null,
        sourceFilename: row.filename as string,
        sourceTitle: row.title as string,
        chunkIndex: row.chunk_index as number,
      }));

      console.log(`  ✓ Using ${fallbackChunks.length} fallback chunks`);
      return formatKnowledgeForAI(fallbackChunks);
    }

    console.log(`  ✓ Found ${searchResults.length} semantically relevant chunks`);
    searchResults.forEach((result, i) => {
      console.log(`     ${i + 1}. ${result.sourceTitle} (similarity: ${result.similarity.toFixed(3)})`);
    });

    // Convert search results to KnowledgeChunk format
    const chunks: KnowledgeChunk[] = searchResults.map(result => ({
      chunkId: result.chunkId,
      chunkText: result.chunkText,
      pageNumber: result.pageNumber,
      sourceFilename: result.sourceFilename,
      sourceTitle: result.sourceTitle,
      chunkIndex: result.chunkIndex,
    }));

    return formatKnowledgeForAI(chunks);
  } catch (error) {
    console.error('Error retrieving RAG context:', error);
    // Don't throw - just return empty string so AI analysis can continue without RAG
    return '';
  }
}

/**
 * Format knowledge chunks for AI context
 */
function formatKnowledgeForAI(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  const context = chunks
    .map((chunk, i) => {
      const pageInfo = chunk.pageNumber ? ` (Page ${chunk.pageNumber})` : '';
      return `
[Source ${i + 1}: ${chunk.sourceTitle}${pageInfo}]
${chunk.chunkText}
`.trim();
    })
    .join('\n\n---\n\n');

  return `
# Permaculture Knowledge Base

Here is relevant information from authoritative permaculture literature:

${context}

When providing recommendations, reference these sources by number (e.g., "According to Source 1...") to ground your advice in established permaculture principles.
`.trim();
}

/**
 * Get count of available knowledge chunks
 * Useful for UI display
 */
export async function getKnowledgeBaseStats(): Promise<{
  totalChunks: number;
  embeddedChunks: number;
  sourceCount: number;
}> {
  try {
    const [chunksResult, sourcesResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM knowledge_chunks`,
        args: [],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM knowledge_sources WHERE processing_status = 'completed'`,
        args: [],
      }),
    ]);

    return {
      totalChunks: (chunksResult.rows[0]?.total as number) || 0,
      embeddedChunks: (chunksResult.rows[0]?.embedded as number) || 0,
      sourceCount: (sourcesResult.rows[0]?.count as number) || 0,
    };
  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    return { totalChunks: 0, embeddedChunks: 0, sourceCount: 0 };
  }
}
