/**
 * Regenerate Embeddings
 * Clears old embeddings and generates new ones with current API
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@libsql/client';

async function regenerateEmbeddings() {
  console.log('🔄 Regenerating Embeddings\n');

  // Import after env vars are loaded
  const { processUnembeddedChunks } = await import('../lib/rag/embedding-generator');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Step 1: Check current state
    console.log('📊 Checking current embeddings...');
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM knowledge_chunks`,
      args: [],
    });
    console.log(`   Total chunks: ${countResult.rows[0]?.total}`);
    console.log(`   With embeddings: ${countResult.rows[0]?.embedded}\n`);

    // Step 2: Clear old embeddings
    console.log('🗑️  Clearing old embeddings...');
    await db.execute({
      sql: `UPDATE knowledge_chunks SET embedding = NULL, embedding_model = NULL, token_count = NULL`,
      args: [],
    });
    console.log('   ✓ Old embeddings cleared\n');

    // Step 3: Generate new embeddings
    console.log('🔢 Generating new embeddings with current API...');
    const result = await processUnembeddedChunks(db, 100);
    console.log(`\n✅ Regeneration complete!`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Failed: ${result.failed}\n`);

    // Step 4: Verify
    console.log('✓ Verifying new embeddings...');
    const verifyResult = await db.execute({
      sql: `SELECT COUNT(*) as embedded, embedding_model FROM knowledge_chunks WHERE embedding IS NOT NULL GROUP BY embedding_model`,
      args: [],
    });
    if (verifyResult.rows.length > 0) {
      console.log(`   ✅ ${verifyResult.rows[0]?.embedded} chunks embedded with ${verifyResult.rows[0]?.embedding_model}`);
    } else {
      console.log('   ❌ No embeddings found!');
    }

  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

regenerateEmbeddings().catch(console.error);
