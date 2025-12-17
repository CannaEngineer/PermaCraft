#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@libsql/client';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: tsx run-migration.ts <migration-file>');
    process.exit(1);
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const migrationPath = join(__dirname, migrationFile);
  let sql = readFileSync(migrationPath, 'utf-8');

  console.log(`Running migration: ${migrationFile}`);

  // Remove all comment lines first
  sql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Split by semicolon and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`);

    try {
      await db.execute(statement);
      console.log(`✓ Success`);
    } catch (error: any) {
      // Ignore "table already exists" errors
      if (error.message && error.message.includes('already exists')) {
        console.log(`⊘ Skipped (already exists)`);
        continue;
      }
      console.error(`✗ Failed to execute statement:`, error);
      console.error('Statement:', statement.substring(0, 150) + '...');
      throw error;
    }
  }

  console.log(`\n✓ Migration completed successfully`);
  process.exit(0);
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
