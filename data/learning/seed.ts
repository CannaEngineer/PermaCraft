#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function seed() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Starting learning system seed...\n');

  // Load data files
  const learningPaths = JSON.parse(
    readFileSync(join(__dirname, 'learning-paths.json'), 'utf-8')
  );
  const topics = JSON.parse(
    readFileSync(join(__dirname, 'topics.json'), 'utf-8')
  );
  const lessons = JSON.parse(
    readFileSync(join(__dirname, 'lessons.json'), 'utf-8')
  );
  const badges = JSON.parse(
    readFileSync(join(__dirname, 'badges.json'), 'utf-8')
  );

  // Seed Learning Paths
  console.log(`📚 Seeding ${learningPaths.length} learning paths...`);
  for (const path of learningPaths) {
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO learning_paths
              (id, name, slug, description, target_audience, estimated_lessons, difficulty, icon_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          path.id,
          path.name,
          path.slug,
          path.description,
          path.target_audience,
          path.estimated_lessons,
          path.difficulty,
          path.icon_name,
        ],
      });
      console.log(`  ✓ ${path.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert ${path.name}:`, error);
    }
  }

  // Seed Topics
  console.log(`\n🎯 Seeding ${topics.length} topics...`);
  for (const topic of topics) {
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO topics
              (id, name, slug, description, icon_name)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          topic.id,
          topic.name,
          topic.slug,
          topic.description,
          topic.icon_name,
        ],
      });
      console.log(`  ✓ ${topic.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert ${topic.name}:`, error);
    }
  }

  // Seed Lessons
  console.log(`\n📖 Seeding ${lessons.length} lessons...`);
  for (const lesson of lessons) {
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO lessons
              (id, topic_id, title, slug, description, content, content_type,
               estimated_minutes, difficulty, prerequisite_lesson_ids, xp_reward, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          lesson.id,
          lesson.topic_id,
          lesson.title,
          lesson.slug,
          lesson.description,
          JSON.stringify(lesson.content), // Convert content object to JSON string
          lesson.content_type,
          lesson.estimated_minutes,
          lesson.difficulty,
          null, // No prerequisites for these sample lessons
          lesson.xp_reward,
          lesson.order_index,
        ],
      });
      console.log(`  ✓ ${lesson.title}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert ${lesson.title}:`, error);
    }
  }

  // Seed Badges
  console.log(`\n🏅 Seeding ${badges.length} badges...`);
  for (const badge of badges) {
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO badges
              (id, name, description, icon_name, badge_type, tier, unlock_criteria)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          badge.id,
          badge.name,
          badge.description,
          badge.icon_name,
          badge.badge_type,
          badge.tier,
          JSON.stringify(badge.unlock_criteria),
        ],
      });
      console.log(`  ✓ ${badge.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to insert ${badge.name}:`, error);
    }
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`\nSummary:`);
  console.log(`  ${learningPaths.length} learning paths`);
  console.log(`  ${topics.length} topics`);
  console.log(`  ${lessons.length} lessons`);
  console.log(`  ${badges.length} badges`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
