/**
 * Apply RAG Schema Migration
 * Creates knowledge_sources, knowledge_chunks, processing_queue, and citations tables
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function applyMigration() {
  console.log('📚 Applying RAG schema migration...\n');

  try {
    const schemaPath = path.join(__dirname, '..', 'lib', 'db', 'rag-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split into individual statements and clean
    const statements = schema
      .split(';')
      .map(s => s.replace(/--[^\n]*/g, '').trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements\n`);

    for (const statement of statements) {
      // Extract table/index name for logging
      const createMatch = statement.match(/CREATE (?:TABLE|INDEX) (?:IF NOT EXISTS )?(\w+)/i);
      const name = createMatch ? createMatch[1] : 'unknown';

      console.log(`Executing: ${name}...`);

      try {
        await db.execute(statement);
        console.log(`✓ ${name} created successfully\n`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`○ ${name} already exists, skipping\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ RAG schema migration completed successfully!\n');

    // Verify tables were created
    const tables = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name LIKE 'knowledge%' OR name LIKE '%processing_queue%' OR name LIKE '%citations%'
      ORDER BY name
    `);

    console.log('📋 RAG tables in database:');
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.name}`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

applyMigration().catch(console.error);
