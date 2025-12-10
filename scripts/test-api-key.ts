/**
 * Test OpenRouter API Key
 * Verifies the API key works for chat completions
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testAPIKey() {
  console.log('🧪 Testing OpenRouter API Key\n');
  console.log(`API Key: ${process.env.OPENROUTER_API_KEY?.substring(0, 15)}...`);
  console.log(`API Key Length: ${process.env.OPENROUTER_API_KEY?.length}\n`);

  // Import openrouter after env vars are loaded
  const { openrouter } = await import('../lib/ai/openrouter');

  // Test chat completions (we know this works)
  console.log('Testing chat completions endpoint...');
  try {
    const response = await openrouter.chat.completions.create({
      model: 'amazon/nova-2-lite-v1:free',
      messages: [{ role: 'user', content: 'Say "test successful"' }],
      max_tokens: 10,
    });

    console.log(`✅ Chat completions work!`);
    console.log(`   Response: ${response.choices[0]?.message?.content}`);
  } catch (error: any) {
    console.log(`❌ Chat completions failed: ${error.status} ${error.message}`);
  }

  // Test embeddings endpoint
  console.log('\nTesting embeddings endpoint...');
  try {
    const response = await openrouter.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: 'test',
    });

    console.log(`✅ Embeddings work!`);
    console.log(`   Dimensions: ${response.data[0].embedding.length}`);
  } catch (error: any) {
    console.log(`❌ Embeddings failed: ${error.status} ${error.message}`);
    console.log(`   Error details:`, error.error);
  }
}

testAPIKey().catch(console.error);
