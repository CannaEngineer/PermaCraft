import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LearningPath } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const landSize = searchParams.get('land_size');
    const experience = searchParams.get('experience');

    if (!landSize || !experience) {
      return NextResponse.json(
        { error: 'Missing required parameters: land_size and experience' },
        { status: 400 }
      );
    }

    // Get all learning paths
    const result = await db.execute('SELECT * FROM learning_paths ORDER BY name');
    const paths = result.rows as unknown as LearningPath[];

    // Calculate match scores for each path
    const scoredPaths = paths.map(path => ({
      path,
      matchScore: calculateMatch(path, { land_size: landSize, experience }),
      reasons: getMatchReasons(path, { land_size: landSize, experience })
    }));

    // Sort by match score descending
    scoredPaths.sort((a, b) => b.matchScore - a.matchScore);

    const recommended = scoredPaths[0];
    const alternatives = scoredPaths.slice(1);

    return NextResponse.json({
      recommended,
      alternatives
    });
  } catch (error) {
    console.error('Wizard recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

function calculateMatch(path: LearningPath, answers: { land_size: string; experience: string }): number {
  let score = 0;

  // Land size matching (40 points max)
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') score += 40;
  if (answers.land_size === 'small_yard' && path.slug === 'urban-food-producer') score += 35;
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') score += 40;
  if (answers.land_size === 'rural' && path.slug === 'rural-regenerator') score += 40;
  if (answers.land_size === 'farm' && path.slug === 'small-farm-operator') score += 40;

  // Experience matching (30 points max)
  if (answers.experience === path.difficulty) score += 30;
  if (answers.experience === 'beginner' && path.difficulty === 'beginner') score += 20;

  // Default comprehensive path bonus (10 points)
  if (path.slug === 'permaculture-student') score += 10;

  return score;
}

function getMatchReasons(path: LearningPath, answers: { land_size: string; experience: string }): string[] {
  const reasons: string[] = [];

  // Land size reasons
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') {
    reasons.push('Perfect for small spaces like balconies and patios');
  }
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') {
    reasons.push('Designed for suburban lots (0.5-2 acres)');
  }
  if (answers.land_size === 'rural' && path.slug === 'rural-regenerator') {
    reasons.push('Ideal for rural properties focused on restoration');
  }
  if (answers.land_size === 'farm' && path.slug === 'small-farm-operator') {
    reasons.push('Tailored for production farming (5-50 acres)');
  }

  // Experience reasons
  if (answers.experience === path.difficulty) {
    reasons.push(`Matches your ${path.difficulty} experience level`);
  }

  // Path-specific reasons
  if (path.slug === 'permaculture-student') {
    reasons.push('Most comprehensive path covering all topics');
  }

  return reasons;
}
