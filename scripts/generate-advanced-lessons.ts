#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// Load env FIRST
config({ path: resolve(process.cwd(), '.env.local') });

interface LessonSpec {
  topic_slug: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  learning_objectives: string;
  key_concepts: string;
  quiz_count: number;
}

async function main() {
  console.log('🚀 Advanced Lesson Generation Starting...\n');

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Error: Database credentials required');
    process.exit(1);
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ Error: OPENROUTER_API_KEY is required');
    process.exit(1);
  }

  // Create OpenRouter client
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'PermaCraft',
    },
  });

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Get admin user
  const adminResult = await db.execute({
    sql: 'SELECT id, email FROM users WHERE is_admin = 1 LIMIT 1',
    args: [],
  });

  if (adminResult.rows.length === 0) {
    console.error('❌ No admin user found');
    process.exit(1);
  }

  const adminUser = adminResult.rows[0] as any;
  console.log(`✓ Admin: ${adminUser.email}\n`);

  // Load advanced specifications
  const specs: LessonSpec[] = JSON.parse(
    readFileSync(join(__dirname, 'lesson-specifications-advanced.json'), 'utf-8')
  );

  console.log(`📚 ${specs.length} advanced lessons to generate\n`);

  // Get topics
  const topicsResult = await db.execute('SELECT id, slug, name FROM topics');
  const topicMap = new Map(
    topicsResult.rows.map((t: any) => [t.slug, { id: t.id, name: t.name }])
  );

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const topic = topicMap.get(spec.topic_slug);

    if (!topic) {
      console.error(`❌ [${i + 1}/${specs.length}] Unknown topic: ${spec.topic_slug}`);
      failCount++;
      continue;
    }

    try {
      console.log(`\n📝 [${i + 1}/${specs.length}] "${spec.title}"`);
      console.log(`   ${topic.name} • ${spec.difficulty} • ${spec.estimated_minutes}min`);

      // Generate slug
      const slug = spec.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if already exists
      const existingResult = await db.execute({
        sql: 'SELECT id FROM lessons WHERE slug = ?',
        args: [slug],
      });

      if (existingResult.rows.length > 0) {
        console.log(`   ⏭️  Already exists, skipping`);
        successCount++;
        continue;
      }

      // Calculate target word count
      const targetWords = Math.floor(spec.estimated_minutes * 80);

      // Build AI prompt
      const systemPrompt = `You are an expert permaculture educator creating factual, science-based lesson content.

CRITICAL REQUIREMENTS:
1. Follow permaculture ethics: Earth Care, People Care, Fair Share
2. Base content on established permaculture principles and scientific research
3. Use scientific names for all plants: Common Name (Genus species)
4. Mark native status: [NATIVE], [NATURALIZED], [NON-NATIVE]
5. Include only factual, verified information
6. Provide practical, actionable guidance
7. Connect to the 12 permaculture design principles
8. Target length: ~${targetWords} words
9. Create exactly ${spec.quiz_count} quiz questions

OUTPUT FORMAT - Return valid JSON:
{
  "core_content": "Full lesson in markdown. Use ## for headings. Include:\\n- Introduction\\n- Main concepts with practical examples\\n- Real-world applications\\n- Connection to permaculture principles\\n- Actionable next steps",
  "quiz": [
    {
      "question": "Clear, specific question testing understanding",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct": 0,
      "explanation": "Why this answer is correct and what it teaches"
    }
  ],
  "source_attribution": "Based on permaculture principles from Mollison, Holmgren, and established research",
  "license": "CC BY-NC-SA"
}

QUALITY STANDARDS:
- Use clear, accurate language for ${spec.difficulty} level
- Include 3-5 concrete, realistic examples
- Reference established permaculture texts where appropriate
- Emphasize observation and site-specific application
- Encourage working with nature, not against it
- Promote biodiversity and ecological health`;

      const userPrompt = `Generate a factual permaculture lesson:

**Topic:** ${topic.name}
**Title:** ${spec.title}
**Difficulty:** ${spec.difficulty}
**Duration:** ${spec.estimated_minutes} minutes

**Learning Objectives:**
${spec.learning_objectives}

**Key Concepts to Cover:**
${spec.key_concepts}

**Quiz Questions:** ${spec.quiz_count}

Create comprehensive, science-based content that teaches these concepts accurately and practically.`;

      // Generate with AI
      console.log(`   🤖 Generating content...`);
      const completion = await openrouter.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No AI response');
      }

      let content;
      try {
        content = JSON.parse(aiResponse);
      } catch (parseError: any) {
        console.log(`   ⚠️  JSON parse error, retrying...`);
        // Retry once on parse error
        const retryCompletion = await openrouter.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Return ONLY valid, complete JSON. No trailing text.' },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 4000,
        });

        const retryResponse = retryCompletion.choices[0]?.message?.content;
        if (!retryResponse) {
          throw new Error('No response on retry');
        }
        content = JSON.parse(retryResponse);
      }

      // Calculate XP
      const baseXP: Record<string, number> = {
        beginner: 20,
        intermediate: 30,
        advanced: 40,
      };
      const xpReward = Math.floor((baseXP[spec.difficulty] || 20) + (spec.estimated_minutes / 15) * 10);

      // Get max order_index
      const maxOrderResult = await db.execute({
        sql: 'SELECT MAX(order_index) as max_order FROM lessons WHERE topic_id = ?',
        args: [topic.id],
      });
      const maxOrder = (maxOrderResult.rows[0] as any)?.max_order || 0;

      // Insert lesson
      const lessonId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);

      await db.execute({
        sql: `INSERT INTO lessons
              (id, topic_id, title, slug, description, content, content_type,
               estimated_minutes, difficulty, prerequisite_lesson_ids, xp_reward, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          lessonId,
          topic.id,
          spec.title,
          slug,
          spec.learning_objectives.split(',')[0].trim(),
          JSON.stringify(content),
          'text',
          spec.estimated_minutes,
          spec.difficulty,
          null,
          xpReward,
          maxOrder + 1,
        ],
      });

      console.log(`   ✅ Published! /learn/lessons/${slug}`);
      successCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ADVANCED LESSON GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📚 Total: ${specs.length}`);
  console.log('\n✨ Lessons are live at http://localhost:3000/learn\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
