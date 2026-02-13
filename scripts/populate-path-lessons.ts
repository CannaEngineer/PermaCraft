#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface Lesson {
  id: string;
  topic_id: string;
  difficulty: string;
  order_index: number;
}

interface PathLessonMapping {
  learning_path_id: string;
  lesson_id: string;
  order_index: number;
  is_required: number;
}

async function populatePathLessons() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔄 Populating path_lessons table...\n');

  // Get all lessons
  const lessonsResult = await db.execute('SELECT id, topic_id, difficulty, order_index FROM lessons ORDER BY order_index');
  const lessons = lessonsResult.rows as unknown as Lesson[];

  console.log(`📚 Found ${lessons.length} lessons\n`);

  // Define path-to-topic mappings based on design doc
  const pathMappings: Record<string, {
    topics: string[];
    difficulties: string[];
    description: string;
  }> = {
    'permaculture-student': {
      topics: ['*'], // ALL topics
      difficulties: ['beginner', 'intermediate', 'advanced'],
      description: 'Comprehensive - all lessons'
    },
    'urban-food-producer': {
      topics: ['intro-permaculture', 'zone-education', 'urban-permaculture', 'polyculture-design', 'soil-building'],
      difficulties: ['beginner', 'intermediate'],
      description: 'Urban focus with zones 0-2, container growing'
    },
    'suburban-homesteader': {
      topics: ['intro-permaculture', 'zone-education', 'soil-building', 'polyculture-design', 'food-forests', 'water-management'],
      difficulties: ['beginner', 'intermediate'],
      description: 'Residential lots - food production and soil building'
    },
    'rural-regenerator': {
      topics: ['intro-permaculture', 'water-management', 'native-first-approach', 'systems-thinking', 'zone-education', 'soil-building'],
      difficulties: ['beginner', 'intermediate', 'advanced'],
      description: 'Ecosystem restoration with water and native species'
    },
    'small-farm-operator': {
      topics: ['intro-permaculture', 'polyculture-design', 'economics-ethics', 'food-forests', 'soil-building', 'systems-thinking'],
      difficulties: ['beginner', 'intermediate', 'advanced'],
      description: 'Production agriculture with permaculture'
    },
    'agro-tourism-developer': {
      topics: ['intro-permaculture', 'economics-ethics', 'food-forests', 'zone-education', 'polyculture-design', 'systems-thinking', 'water-management'],
      difficulties: ['beginner', 'intermediate', 'advanced'],
      description: 'Educational farms and visitor experiences'
    }
  };

  // Generate mappings for each path
  const allMappings: PathLessonMapping[] = [];

  for (const [pathId, config] of Object.entries(pathMappings)) {
    console.log(`\n📖 ${pathId}`);
    console.log(`   ${config.description}`);

    // Filter lessons based on path criteria
    const pathLessons = lessons.filter(lesson => {
      // Check topic match
      const topicMatch = config.topics.includes('*') || config.topics.includes(lesson.topic_id);
      if (!topicMatch) return false;

      // Check difficulty match
      const difficultyMatch = config.difficulties.includes(lesson.difficulty);
      return difficultyMatch;
    });

    // Sort by original order_index to maintain curriculum flow
    pathLessons.sort((a, b) => a.order_index - b.order_index);

    // Add to mappings with new order_index for this path
    pathLessons.forEach((lesson, index) => {
      allMappings.push({
        learning_path_id: pathId,
        lesson_id: lesson.id,
        order_index: index,
        is_required: 1
      });
    });

    console.log(`   ✓ Mapped ${pathLessons.length} lessons`);
  }

  // Insert all mappings
  console.log(`\n💾 Inserting ${allMappings.length} path-lesson mappings...`);

  let insertCount = 0;
  for (const mapping of allMappings) {
    try {
      await db.execute({
        sql: `INSERT INTO path_lessons (id, learning_path_id, lesson_id, order_index, is_required)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          mapping.learning_path_id,
          mapping.lesson_id,
          mapping.order_index,
          mapping.is_required
        ]
      });
      insertCount++;
    } catch (error) {
      console.error(`   ✗ Failed to insert mapping:`, error);
    }
  }

  console.log(`\n✅ Successfully inserted ${insertCount} mappings!`);

  // Show summary
  console.log('\n📊 Summary by path:');
  const summary = await db.execute(`
    SELECT
      lp.name,
      COUNT(pl.id) as lesson_count
    FROM learning_paths lp
    LEFT JOIN path_lessons pl ON lp.id = pl.learning_path_id
    GROUP BY lp.id
    ORDER BY lp.name
  `);

  for (const row of summary.rows) {
    console.log(`   ${(row as any).name}: ${(row as any).lesson_count} lessons`);
  }

  process.exit(0);
}

populatePathLessons().catch((error) => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
