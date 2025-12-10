/**
 * Manual RAG Test
 * Directly invokes scanner and processor to test the full pipeline
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function manualRAGTest() {
  console.log('🧪 Manual RAG Pipeline Test\n');

  try {
    // Dynamically import the RAG modules after env is loaded
    const { autoScanAndQueue } = await import('../lib/rag/auto-scanner.js');
    const { processQueue } = await import('../lib/rag/document-processor.js');

    // Step 1: Scan and queue
    console.log('1️⃣ Scanning and queuing documents...\n');
    await autoScanAndQueue();

    // Step 2: Check queue
    console.log('2️⃣ Checking processing queue...');
    const queue = await db.execute(`
      SELECT COUNT(*) as count, status
      FROM knowledge_processing_queue
      GROUP BY status
    `);

    queue.rows.forEach((row: any) => {
      console.log(`   - ${row.status}: ${row.count}`);
    });
    console.log();

    // Step 3: Process queue
    const pendingCount = queue.rows.find((r: any) => r.status === 'queued');

    if (pendingCount && Number(pendingCount.count) > 0) {
      console.log('3️⃣ Processing documents...');
      const processResult = await processQueue(10);

      console.log(`   ✓ Processing complete:`);
      console.log(`      - Succeeded: ${processResult.processed}`);
      console.log(`      - Failed: ${processResult.failed}`);
      console.log();
    } else {
      console.log('3️⃣ No documents to process');
      console.log();
    }

    // Step 4: Verify results
    console.log('4️⃣ Verifying results...');

    const sources = await db.execute(`
      SELECT filename, processing_status, total_chunks
      FROM knowledge_sources
      ORDER BY created_at DESC
    `);

    console.log(`   📊 Documents in database: ${sources.rows.length}`);
    sources.rows.forEach((row: any) => {
      console.log(`      - ${row.filename}: ${row.processing_status} (${row.total_chunks || 0} chunks)`);
    });
    console.log();

    const chunks = await db.execute(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
    `);

    console.log(`   📝 Total chunks: ${chunks.rows[0]?.count || 0}`);
    console.log();

    // Show sample chunks
    const sampleChunks = await db.execute(`
      SELECT kc.chunk_index, ks.filename, SUBSTR(kc.chunk_text, 1, 100) as preview
      FROM knowledge_chunks kc
      JOIN knowledge_sources ks ON ks.id = kc.source_id
      LIMIT 3
    `);

    if (sampleChunks.rows.length > 0) {
      console.log('   📄 Sample chunks:');
      sampleChunks.rows.forEach((row: any) => {
        console.log(`      [${row.filename} #${row.chunk_index}] ${row.preview}...`);
      });
      console.log();
    }

    console.log('✅ Manual RAG Test Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

manualRAGTest().catch(console.error);
