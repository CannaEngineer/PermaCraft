import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@libsql/client';

async function checkEmbeddings() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const result = await db.execute({
    sql: `SELECT COUNT(*) as total, COUNT(embedding) as with_embeddings, embedding_model FROM knowledge_chunks GROUP BY embedding_model;`,
    args: [],
  });

  console.log('Embedding status:');
  console.table(result.rows);

  // Check sample
  const sample = await db.execute({
    sql: `SELECT id, LENGTH(chunk_text) as text_length, LENGTH(embedding) as embedding_size, embedding_model FROM knowledge_chunks LIMIT 3;`,
    args: [],
  });

  console.log('\nSample chunks:');
  console.table(sample.rows);
}

checkEmbeddings().catch(console.error);
