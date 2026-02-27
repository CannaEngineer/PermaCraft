/**
 * Cleans up blog posts that contain Permaculture.Studio / Permacraft brand references
 * or specific feature flows that may not exist.
 *
 * Run: npx tsx scripts/cleanup-blog-posts.ts
 */

import { createClient } from '@libsql/client';
import OpenAI from 'openai';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio',
    'X-Title': 'Permaculture.Studio',
  },
});

const PROBLEMATIC_IDS = [
  '776f81c7-e9b9-40c1-aeb4-074e27705c20',
  'a0bdb9df-85ca-4476-9b5b-17db026fede9',
  '3d3ad08d-cfc9-4e36-b359-a9474ee965b7',
  '84067923-e959-4eb6-b748-c72f2ba343ce',
  '32524af0-9647-499f-b009-1df123839c04',
  '07653f0d-ffc8-415c-95b9-e9de60e9c1b9',
];

const CLEANUP_SYSTEM_PROMPT = `You are editing permaculture blog posts to remove brand and feature-specific references.

RULES:
1. Remove ALL mentions of "Permaculture.Studio", "Permacraft", or any branded tool name
2. Remove ALL specific UI instructions: "drag-drop", "log in", "sign up", "click the", "navigate to", "drop pins", "pull your base map", "upload your sketch", "open the app"
3. Remove ALL references to specific features that may or may not exist: "auto-zone detection", "guild tool", "native guilds database", "Winter Native Overlay", "water flow sim", "shadow simulator", "zip code suggestions", "layer toggle", "drag-drop to simulate"
4. Remove entire "Design Tips for Permaculture.Studio" sections
5. Replace these with general permaculture knowledge, design principles, or practical garden advice
6. Keep all plant names, zone concepts, permaculture principles, and practical gardening content
7. You MAY keep general phrases like "map-based design tools can help you visualize..." but no specific instructions
8. Maintain the same length, tone, and structure — just clean out the brand/feature language

Return ONLY the cleaned markdown content with no extra explanation.`;

async function cleanPost(id: string, title: string, content: string): Promise<string> {
  console.log(`\n🧹 Cleaning: ${title}`);

  const response = await openrouter.chat.completions.create({
    model: 'google/gemini-2.5-flash-lite',
    messages: [
      { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Clean this blog post by removing all brand/feature references per the rules:\n\n${content}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 8000,
  });

  const cleaned = response.choices[0]?.message?.content?.trim() || '';

  if (!cleaned || cleaned.length < 500) {
    throw new Error(`Cleaned content too short (${cleaned.length} chars)`);
  }

  return cleaned;
}

async function main() {
  console.log('🔍 Fetching problematic posts...');

  const result = await db.execute({
    sql: `SELECT id, title, content FROM blog_posts WHERE id IN (${PROBLEMATIC_IDS.map(() => '?').join(',')})`,
    args: PROBLEMATIC_IDS,
  });

  console.log(`Found ${result.rows.length} posts to clean\n`);

  for (const row of result.rows as any[]) {
    try {
      const cleaned = await cleanPost(row.id, row.title, row.content);

      await db.execute({
        sql: 'UPDATE blog_posts SET content = ? WHERE id = ?',
        args: [cleaned, row.id],
      });

      console.log(`✅ Updated: ${row.title}`);
    } catch (err: any) {
      console.error(`❌ Failed: ${row.title} — ${err.message}`);
    }
  }

  console.log('\n✅ Cleanup complete');
}

main().catch(console.error);
