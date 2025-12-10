/**
 * Test Embedding Generation
 * Tests generating vector embeddings for knowledge chunks
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@libsql/client';

async function testEmbeddings() {
  console.log('🧪 Testing Embedding Generation\n');

  // Import after env vars are loaded
  const { processUnembeddedChunks } = await import('../lib/rag/embedding-generator');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('❌ OpenRouter API key not configured!\n');
      console.log('To enable embeddings, add this to your .env.local file:');
      console.log('OPENROUTER_API_KEY=sk-or-...\n');
      console.log('Get your API key from: https://openrouter.ai/keys\n');
      console.log('Using model: qwen/qwen3-embedding-8b (8192 dimensions)\n');
      return;
    }

    // Check for chunks without embeddings
    const chunksResult = await db.execute(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE embedding IS NULL
    `);

    const unembeddedCount = chunksResult.rows[0]?.count || 0;
    console.log(`📊 Chunks without embeddings: ${unembeddedCount}\n`);

    if (unembeddedCount === 0) {
      console.log('✅ All chunks already have embeddings!\n');

      // Show sample embedded chunk
      const sampleResult = await db.execute(`
        SELECT chunk_text, token_count, embedding_model
        FROM knowledge_chunks
        WHERE embedding IS NOT NULL
        LIMIT 1
      `);

      if (sampleResult.rows.length > 0) {
        const sample = sampleResult.rows[0];
        console.log('📄 Sample embedded chunk:');
        console.log(`   Text: ${(sample.chunk_text as string).substring(0, 80)}...`);
        console.log(`   Model: ${sample.embedding_model}`);
        console.log(`   Tokens: ${sample.token_count}`);
      }

      return;
    }

    // Generate embeddings
    console.log('🔢 Generating embeddings...\n');
    const result = await processUnembeddedChunks(db, 100);

    console.log(`\n✅ Embedding generation complete!`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Failed: ${result.failed}\n`);

    // Verify embeddings were saved
    const embeddedResult = await db.execute(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE embedding IS NOT NULL
    `);

    const embeddedCount = embeddedResult.rows[0]?.count || 0;
    console.log(`📊 Total chunks with embeddings: ${embeddedCount}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

testEmbeddings().catch(console.error);
