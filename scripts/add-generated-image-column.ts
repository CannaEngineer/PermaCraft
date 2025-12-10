/**
 * Database Migration: Add generated_image_url column to ai_analyses
 *
 * Adds support for storing AI-generated sketch images in conversations.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function addGeneratedImageColumn() {
  const { db } = await import('../lib/db/index.js');

  console.log('📊 Adding generated_image_url column to ai_analyses table...\n');

  try {
    await db.execute({
      sql: 'ALTER TABLE ai_analyses ADD COLUMN generated_image_url TEXT',
      args: [],
    });

    console.log('✅ Column added successfully!');
  } catch (error: any) {
    if (error.message?.includes('duplicate column')) {
      console.log('⚠️  Column already exists, skipping');
    } else {
      console.error('❌ Error adding column:', error);
      throw error;
    }
  }

  // Verify the column was added
  const result = await db.execute({
    sql: 'SELECT generated_image_url FROM ai_analyses LIMIT 1',
    args: [],
  });

  console.log('\n✅ Migration complete! Column is ready to use.');
}

addGeneratedImageColumn().catch(console.error);
