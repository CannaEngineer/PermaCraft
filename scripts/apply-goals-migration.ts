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

async function applyGoalsMigration() {
  const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
  }

  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });

  console.log('Applying farmer_goals table migration...');

  const schemaPath = path.join(__dirname, '..', 'lib', 'db', 'goals-schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  // Remove comment-only lines
  const cleanedSQL = schemaSQL
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Split by semicolon and execute each statement
  const statements = cleanedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      // Remove inline comments for cleaner output
      const cleanStatement = statement.replace(/--[^\n]*/g, '').trim();
      const preview = cleanStatement.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`Executing: ${preview}...`);
      await db.execute(cleanStatement);
      console.log('✓ Success');
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('⚠ Already exists, skipping');
      } else {
        console.error('✗ Error:', error.message);
        throw error;
      }
    }
  }

  console.log('\n✅ Goals table migration completed successfully!');
  process.exit(0);
}

applyGoalsMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
