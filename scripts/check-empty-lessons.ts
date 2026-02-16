/**
 * Script to check for empty or minimal lesson content
 * Flags lessons that need content generation
 *
 * Usage: npx tsx scripts/check-empty-lessons.ts [--fix]
 */

import { db } from '../lib/db';
import type { Lesson } from '../lib/db/schema';

interface EmptyLesson {
  id: string;
  title: string;
  slug: string;
  topic_id: string;
  content_length: number;
  issue: string;
}

async function checkEmptyLessons(autoFix: boolean = false) {
  console.log('🔍 Checking for empty or minimal lessons...\n');

  try {
    // Get all lessons
    const result = await db.execute({
      sql: `SELECT l.*, t.name as topic_name
            FROM lessons l
            LEFT JOIN topics t ON l.topic_id = t.id
            ORDER BY t.name, l.order_index`,
      args: []
    });

    const lessons = result.rows as unknown as (Lesson & { topic_name: string })[];
    const emptyLessons: EmptyLesson[] = [];

    console.log(`📚 Total lessons: ${lessons.length}\n`);

    // Check each lesson
    for (const lesson of lessons) {
      let issue: string | null = null;

      // Check if content is empty or null
      if (!lesson.content || lesson.content.trim().length === 0) {
        issue = 'Empty content';
      }
      // Check if content is minimal (less than 100 characters)
      else if (lesson.content.trim().length < 100) {
        issue = `Minimal content (${lesson.content.trim().length} chars)`;
      }
      // Check if content is just a placeholder
      else if (
        lesson.content.includes('TODO') ||
        lesson.content.includes('Coming soon') ||
        lesson.content.includes('[placeholder]')
      ) {
        issue = 'Placeholder content detected';
      }

      if (issue) {
        emptyLessons.push({
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          topic_id: lesson.topic_id,
          content_length: lesson.content?.length || 0,
          issue
        });

        console.log(`❌ ${lesson.topic_name} > ${lesson.title}`);
        console.log(`   Issue: ${issue}`);
        console.log(`   ID: ${lesson.id}`);
        console.log(`   Slug: ${lesson.slug}\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Total lessons: ${lessons.length}`);
    console.log(`   Empty/minimal: ${emptyLessons.length}`);
    console.log(`   Completion rate: ${((lessons.length - emptyLessons.length) / lessons.length * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    if (emptyLessons.length > 0) {
      console.log('📝 Lessons that need content:\n');

      // Group by topic
      const byTopic = emptyLessons.reduce((acc, lesson) => {
        const topic = lessons.find(l => l.id === lesson.id)?.topic_name || 'Unknown';
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(lesson);
        return acc;
      }, {} as Record<string, EmptyLesson[]>);

      Object.entries(byTopic).forEach(([topic, topicLessons]) => {
        console.log(`\n${topic}:`);
        topicLessons.forEach(lesson => {
          console.log(`  - ${lesson.title} (${lesson.slug})`);
        });
      });

      if (autoFix) {
        console.log('\n🤖 Auto-fix mode enabled');
        console.log('⚠️  Auto-fix not yet implemented. Use generate-all-lessons.ts instead.');
        console.log('   Example: npx tsx scripts/generate-all-lessons.ts');
      } else {
        console.log('\n💡 To generate content for these lessons:');
        console.log('   npx tsx scripts/generate-all-lessons.ts');
        console.log('   OR');
        console.log('   npx tsx scripts/check-empty-lessons.ts --fix (not yet implemented)');
      }
    } else {
      console.log('✅ All lessons have content!');
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      total: lessons.length,
      empty: emptyLessons.length,
      completion_rate: ((lessons.length - emptyLessons.length) / lessons.length * 100).toFixed(1),
      empty_lessons: emptyLessons
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      'empty-lessons-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n💾 Report saved to empty-lessons-report.json');

  } catch (error) {
    console.error('Error checking lessons:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const autoFix = args.includes('--fix');

checkEmptyLessons(autoFix).then(() => {
  process.exit(0);
});
