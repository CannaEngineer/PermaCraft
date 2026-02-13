import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { LearningPath } from '@/lib/db/schema';
import { z } from 'zod';

// Scoring weights for calculating learning path match scores
const SCORING_WEIGHTS = {
  PERFECT_LAND_MATCH: 40,
  GOOD_LAND_MATCH: 35,
  DIFFICULTY_MATCH: 30,
  BEGINNER_BONUS: 20, // Extra weight to steer beginners toward appropriate paths
  DEFAULT_PATH_BONUS: 10,
} as const;

const wizardParamsSchema = z.object({
  land_size: z.enum(['balcony', 'small_yard', 'suburban', 'rural', 'farm']),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const landSize = searchParams.get('land_size');
    const experience = searchParams.get('experience');

    // Validate input with Zod
    const validationResult = wizardParamsSchema.safeParse({
      land_size: landSize,
      experience: experience,
    });

    if (!validationResult.success) {
      return Response.json(
        {
          error: 'Invalid input parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { land_size, experience: userExperience } = validationResult.data;

    // Get all learning paths
    const result = await db.execute('SELECT * FROM learning_paths ORDER BY name');
    const paths = result.rows as unknown as LearningPath[];

    // Handle empty database edge case
    if (paths.length === 0) {
      return Response.json(
        { error: 'No learning paths available' },
        { status: 404 }
      );
    }

    // Calculate match scores for each path
    const scoredPaths = paths.map(path => ({
      path,
      matchScore: calculateMatch(path, { land_size, experience: userExperience }),
      reasons: getMatchReasons(path, { land_size, experience: userExperience })
    }));

    // Sort by match score descending
    scoredPaths.sort((a, b) => b.matchScore - a.matchScore);

    const recommended = scoredPaths[0];
    const alternatives = scoredPaths.slice(1);

    return Response.json({
      recommended,
      alternatives
    });
  } catch (error) {
    console.error('Wizard recommendations error:', error);
    return Response.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

function calculateMatch(path: LearningPath, answers: { land_size: string; experience: string }): number {
  let score = 0;

  // Land size matching
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') {
    score += SCORING_WEIGHTS.PERFECT_LAND_MATCH;
  }
  if (answers.land_size === 'small_yard' && path.slug === 'urban-food-producer') {
    score += SCORING_WEIGHTS.GOOD_LAND_MATCH;
  }
  if (answers.land_size === 'suburban' && path.slug === 'suburban-homesteader') {
    score += SCORING_WEIGHTS.PERFECT_LAND_MATCH;
  }
  if (answers.land_size === 'rural' && path.slug === 'rural-regenerator') {
    score += SCORING_WEIGHTS.PERFECT_LAND_MATCH;
  }
  if (answers.land_size === 'farm' && path.slug === 'small-farm-operator') {
    score += SCORING_WEIGHTS.PERFECT_LAND_MATCH;
  }

  // Experience matching
  if (answers.experience === path.difficulty) {
    score += SCORING_WEIGHTS.DIFFICULTY_MATCH;
  }

  // Intentional: Give beginners extra weight (50 total) to strongly steer them toward
  // beginner-appropriate paths, reducing risk of overwhelming new users
  if (answers.experience === 'beginner' && path.difficulty === 'beginner') {
    score += SCORING_WEIGHTS.BEGINNER_BONUS;
  }

  // Default comprehensive path bonus
  if (path.slug === 'permaculture-student') {
    score += SCORING_WEIGHTS.DEFAULT_PATH_BONUS;
  }

  return score;
}

function getMatchReasons(path: LearningPath, answers: { land_size: string; experience: string }): string[] {
  const reasons: string[] = [];

  // Land size reasons
  if (answers.land_size === 'balcony' && path.slug === 'urban-food-producer') {
    reasons.push('Perfect for small spaces like balconies and patios');
  }
  if (answers.land_size === 'small_yard' && path.slug === 'urban-food-producer') {
    reasons.push('Great for small yards and compact spaces');
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
