/**
 * Test RAG System
 * Manually tests the scanning and processing pipeline
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as crypto from 'crypto';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Import scanner and processor functions dynamically after env is loaded
const KNOWLEDGE_FOLDER = path.join(__dirname, '..', 'data', 'knowledge');

async function testRAGSystem() {
  console.log('🧪 Testing RAG System\n');

  try {
    // Step 1: Check knowledge folder
    console.log('1️⃣ Checking knowledge folder...');

    if (!fs.existsSync(KNOWLEDGE_FOLDER)) {
      console.log('   ❌ Knowledge folder does not exist!');
      console.log(`   Creating: ${KNOWLEDGE_FOLDER}`);
      fs.mkdirSync(KNOWLEDGE_FOLDER, { recursive: true });
    }

    const files = fs.readdirSync(KNOWLEDGE_FOLDER).filter(f => f.endsWith('.pdf'));
    console.log(`   ✓ Found ${files.length} PDF file(s) in knowledge folder`);

    if (files.length === 0) {
      console.log('\n   📝 No PDFs found. To test the system:');
      console.log('      1. Add a permaculture PDF to data/knowledge/');
      console.log('      2. Restart the Next.js dev server (or run npm run dev)\n');
      console.log('   Continuing with database checks...\n');
    } else {
      console.log('   📄 Files:');
      files.forEach(f => console.log(`      - ${f}`));
      console.log();
    }

    // Step 2: Check database tables
    console.log('2️⃣ Checking database tables...');
    try {
      await db.execute('SELECT 1 FROM knowledge_sources LIMIT 1');
      console.log('   ✓ knowledge_sources table exists');
      await db.execute('SELECT 1 FROM knowledge_chunks LIMIT 1');
      console.log('   ✓ knowledge_chunks table exists');
      await db.execute('SELECT 1 FROM knowledge_processing_queue LIMIT 1');
      console.log('   ✓ knowledge_processing_queue table exists');
    } catch (error) {
      console.log('   ❌ RAG tables missing! Run: npx tsx scripts/apply-rag-migration.ts');
      throw error;
    }
    console.log();

    // Step 3: Check database
    console.log('3️⃣ Checking database state...');

    const sources = await db.execute('SELECT id, filename, processing_status, total_chunks FROM knowledge_sources ORDER BY created_at DESC LIMIT 10');
    console.log(`   ✓ Knowledge sources in DB: ${sources.rows.length}`);

    if (sources.rows.length > 0) {
      console.log('\n   📊 Recent sources:');
      sources.rows.forEach((row: any) => {
        console.log(`      - ${row.filename}: ${row.processing_status} (${row.total_chunks || 0} chunks)`);
      });
    }
    console.log();

    const queue = await db.execute('SELECT COUNT(*) as count, status FROM knowledge_processing_queue GROUP BY status');
    console.log(`   📋 Processing queue:`);

    if (queue.rows.length === 0) {
      console.log('      - Empty');
    } else {
      queue.rows.forEach((row: any) => {
        console.log(`      - ${row.status}: ${row.count}`);
      });
    }
    console.log();

    // Summary
    console.log('✅ RAG System Test Complete!\n');

    const finalSources = await db.execute('SELECT COUNT(*) as count FROM knowledge_sources');
    const finalChunks = await db.execute('SELECT COUNT(*) as count FROM knowledge_chunks');

    console.log('📊 System Summary:');
    console.log(`   - Total documents: ${finalSources.rows[0]?.count || 0}`);
    console.log(`   - Total chunks: ${finalChunks.rows[0]?.count || 0}`);
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

testRAGSystem().catch(console.error);
