#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db/index.js';

async function runMigration(filename: string) {
  const migration = readFileSync(`./lib/db/migrations/${filename}`, 'utf-8');

  console.log(`Running migration: ${filename}`);

  // Split by semicolon and execute each statement
  const statements = migration.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await db.execute(statement.trim());
    }
  }

  console.log('✅ Migration complete');
  await db.close();
}

const migrationFile = process.argv[2] || '009_blog_topic_queue.sql';
runMigration(migrationFile);
