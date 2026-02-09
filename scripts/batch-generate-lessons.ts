#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DELAY_BETWEEN_LESSONS = 2000; // 2 seconds between generations

interface LessonSpec {
  topic_slug: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  learning_objectives: string;
  key_concepts: string;
  quiz_count: number;
}

async function getTopics() {
  const response = await fetch(`${API_BASE}/api/learning/topics`);
  if (!response.ok) throw new Error('Failed to fetch topics');
  return await response.json();
}

async function generateLesson(spec: LessonSpec, topicId: string, authCookie: string) {
  const response = await fetch(`${API_BASE}/api/admin/content/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie,
    },
    body: JSON.stringify({
      topic_id: topicId,
      title: spec.title,
      difficulty: spec.difficulty,
      estimated_minutes: spec.estimated_minutes,
      learning_objectives: spec.learning_objectives,
      key_concepts: spec.key_concepts,
      quiz_count: spec.quiz_count,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  return await response.json();
}

async function publishLesson(generationId: string, authCookie: string) {
  const response = await fetch(`${API_BASE}/api/admin/content/publish/${generationId}`, {
    method: 'POST',
    headers: {
      'Cookie': authCookie,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Publish failed');
  }

  return await response.json();
}

async function main() {
  console.log('🚀 Starting batch lesson generation...\n');

  // Check if auth cookie is provided
  if (!process.env.AUTH_COOKIE) {
    console.error('❌ Error: AUTH_COOKIE environment variable is required');
    console.error('\nTo get your auth cookie:');
    console.error('1. Log into PermaCraft in your browser');
    console.error('2. Open Developer Tools (F12)');
    console.error('3. Go to Application > Cookies');
    console.error('4. Copy the "better-auth.session_token" cookie value');
    console.error('5. Run: AUTH_COOKIE="better-auth.session_token=YOUR_VALUE" npx tsx scripts/batch-generate-lessons.ts');
    process.exit(1);
  }
  const authCookie: string = process.env.AUTH_COOKIE;

  // Load lesson specifications
  const specs: LessonSpec[] = JSON.parse(
    readFileSync(join(__dirname, 'lesson-specifications.json'), 'utf-8')
  );

  console.log(`📚 Found ${specs.length} lesson specifications\n`);

  // Get topics
  console.log('🔍 Fetching topics...');
  const topics = await getTopics();
  const topicMap = new Map(topics.map((t: any) => [t.slug, t.id]));
  console.log(`✓ Loaded ${topics.length} topics\n`);

  let successCount = 0;
  let failCount = 0;

  // Generate each lesson
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const topicId = topicMap.get(spec.topic_slug);

    if (!topicId) {
      console.error(`❌ [${i + 1}/${specs.length}] Topic not found: ${spec.topic_slug}`);
      failCount++;
      continue;
    }

    try {
      console.log(`\n📝 [${i + 1}/${specs.length}] Generating: "${spec.title}"`);
      console.log(`   Topic: ${spec.topic_slug} | Difficulty: ${spec.difficulty} | ${spec.estimated_minutes} min`);

      // Generate lesson
      const generation = await generateLesson(spec, topicId, authCookie);
      console.log(`   ✓ Generated (ID: ${generation.generation_id})`);

      // Auto-publish
      console.log(`   📤 Publishing...`);
      const published = await publishLesson(generation.generation_id, authCookie);
      console.log(`   ✅ Published! Slug: ${published.slug}`);

      successCount++;

      // Delay to avoid rate limiting
      if (i < specs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LESSONS));
      }
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BATCH GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📚 Total: ${specs.length}`);
  console.log('\n✨ All lessons are now live at /learn');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
