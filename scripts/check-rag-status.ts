/**
 * Check RAG System Status
 * Shows status of all PDFs and processing queue
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@libsql/client';

async function checkStatus() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('📊 RAG System Status\n');

  // Knowledge sources
  console.log('📚 Knowledge Sources:');
  const sources = await db.execute({
    sql: `SELECT filename, processing_status, total_chunks,
                 datetime(created_at, 'unixepoch') as added
          FROM knowledge_sources
          ORDER BY created_at DESC`,
    args: [],
  });

  if (sources.rows.length === 0) {
    console.log('  (none)\n');
  } else {
    console.table(sources.rows);
  }

  // Processing queue
  console.log('\n📋 Processing Queue:');
  const queue = await db.execute({
    sql: `SELECT filename, status, priority,
                 datetime(queued_at, 'unixepoch') as queued
          FROM knowledge_processing_queue
          WHERE status != 'completed'
          ORDER BY priority DESC, queued_at ASC`,
    args: [],
  });

  if (queue.rows.length === 0) {
    console.log('  (empty)\n');
  } else {
    console.table(queue.rows);
  }

  // Embeddings status
  console.log('\n🔢 Embeddings:');
  const embeddings = await db.execute({
    sql: `SELECT COUNT(*) as total,
                 COUNT(embedding) as embedded,
                 embedding_model
          FROM knowledge_chunks
          GROUP BY embedding_model`,
    args: [],
  });

  if (embeddings.rows.length === 0) {
    console.log('  No chunks yet\n');
  } else {
    console.table(embeddings.rows);
  }

  db.close();
}

checkStatus().catch(console.error);
