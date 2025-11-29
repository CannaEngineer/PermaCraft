import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
  }

  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  console.log('Applying migration 002_add_conversations.sql...');

  const migrationPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', '002_add_conversations.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      await db.execute(statement);
      console.log('✓ Success');
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error.message?.includes('already exists') || error.message?.includes('duplicate column')) {
        console.log('⚠ Already exists, skipping');
      } else {
        console.error('✗ Error:', error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ Migration completed successfully!');
  process.exit(0);
}

applyMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
