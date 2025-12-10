import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@libsql/client';

async function checkDimensions() {
  console.log('🔍 Checking Embedding Dimensions\n');

  // Import after env vars
  const { generateQueryEmbedding } = await import('../lib/rag/embedding-generator');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Check stored embeddings
  const result = await db.execute({
    sql: `SELECT id, embedding, LENGTH(embedding) as byte_length FROM knowledge_chunks WHERE embedding IS NOT NULL LIMIT 1`,
    args: [],
  });

  if (result.rows.length > 0) {
    const row = result.rows[0];
    const embeddingBuffer = Buffer.from(row.embedding as any);
    const storedDims = embeddingBuffer.byteLength / 4; // 4 bytes per float
    console.log(`Stored embedding dimensions: ${storedDims}`);
    console.log(`Stored embedding bytes: ${row.byte_length}`);
  }

  // Generate query embedding
  console.log('\nGenerating query embedding...');
  const queryEmbedding = await generateQueryEmbedding('test query');
  console.log(`Query embedding dimensions: ${queryEmbedding.length}`);

  db.close();
}

checkDimensions().catch(console.error);
