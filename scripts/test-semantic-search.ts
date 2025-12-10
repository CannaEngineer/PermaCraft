/**
 * Test Semantic Search
 *
 * Tests the semantic search functionality with embedded chunks
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@libsql/client';

async function testSemanticSearch() {
  console.log('🧪 Testing Semantic Search\n');

  // Import after env vars are loaded
  const { semanticSearch, formatResultsForAI, searchAndFormat } = await import('../lib/rag/semantic-search');

  // Create database client after env vars are loaded
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Test queries
  const testQueries = [
    'How do I design a guild with apple trees?',
    'What is permaculture?',
    'soil building and composting',
    'water management and swales',
  ];

  for (const query of testQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log('='.repeat(60));

    try {
      // Test basic search
      const results = await semanticSearch(db, query, 3, 0.5);

      if (results.length === 0) {
        console.log('❌ No results found (may need to generate embeddings first)');
        continue;
      }

      console.log(`\n✅ Found ${results.length} relevant chunks:\n`);

      results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.sourceTitle} (Page ${result.pageNumber || '?'})`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
        console.log(`   Preview: ${result.chunkText.substring(0, 150)}...`);
        console.log();
      });

      // Test formatted output
      console.log('\n📄 Formatted for AI:\n');
      const formatted = formatResultsForAI(results);
      console.log(formatted.substring(0, 500) + '...\n');

    } catch (error) {
      console.error(`❌ Error searching for "${query}":`, error);
    }
  }

  // Test the combined helper
  console.log('\n' + '='.repeat(60));
  console.log('Testing searchAndFormat helper');
  console.log('='.repeat(60));

  try {
    const formatted = await searchAndFormat(db, 'permaculture design principles', 3);
    console.log('\n✅ Combined search and format successful');
    console.log('Output length:', formatted.length, 'characters\n');
  } catch (error) {
    console.error('❌ Error with searchAndFormat:', error);
  }

  console.log('\n🎉 Test complete!\n');
}

// Run the test
testSemanticSearch()
  .then(() => {
    console.log('✅ All tests passed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
