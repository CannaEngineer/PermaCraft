/**
 * Test OpenRouter Embeddings API
 * Tests different embedding models to find what works
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmbeddingsAPI() {
  console.log('🧪 Testing OpenRouter Embeddings API\n');

  // Import openrouter after env vars are loaded
  const { openrouter } = await import('../lib/ai/openrouter');

  // Test models from OpenRouter docs
  const modelsToTest = [
    'openai/text-embedding-3-small',
    'openai/text-embedding-3-large',
    'qwen/qwen3-embedding-8b',
    'qwen/qwen3-embedding-0.6b',
  ];

  const testText = 'This is a test sentence for embedding generation.';

  for (const model of modelsToTest) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing model: ${model}`);
    console.log('='.repeat(60));

    try {
      const response = await openrouter.embeddings.create({
        model: model,
        input: testText,
      });

      const embedding = response.data[0].embedding;
      console.log(`✅ Success!`);
      console.log(`   Dimensions: ${embedding.length}`);
      console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
      console.log(`   Model: ${model}`);

    } catch (error: any) {
      console.log(`❌ Failed`);
      console.log(`   Error: ${error.status} ${error.message}`);
      if (error.error) {
        console.log(`   Details: ${JSON.stringify(error.error, null, 2)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
}

testEmbeddingsAPI().catch(console.error);
