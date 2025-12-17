import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { openrouter } from '@/lib/ai/openrouter';

// POST /api/learning/practice-farms/[id]/submit - Submit practice farm for AI grading
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const practiceFarmId = params.id;

  try {
    // Get practice farm with zones and plantings
    const farmResult = await db.execute({
      sql: 'SELECT * FROM practice_farms WHERE id = ? AND user_id = ?',
      args: [practiceFarmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return new Response('Practice farm not found', { status: 404 });
    }

    const farm = farmResult.rows[0] as any;

    // Get zones
    const zonesResult = await db.execute({
      sql: 'SELECT * FROM practice_zones WHERE practice_farm_id = ?',
      args: [practiceFarmId],
    });

    // Get plantings with species info
    const plantingsResult = await db.execute({
      sql: `
        SELECT pp.*, s.common_name, s.scientific_name, s.is_native, s.layer
        FROM practice_plantings pp
        LEFT JOIN species s ON pp.species_id = s.id
        WHERE pp.practice_farm_id = ?
      `,
      args: [practiceFarmId],
    });

    const zones = zonesResult.rows;
    const plantings = plantingsResult.rows;

    // Get lesson info if associated
    let lessonContext = '';
    if (farm.lesson_id) {
      const lessonResult = await db.execute({
        sql: 'SELECT title, description FROM lessons WHERE id = ?',
        args: [farm.lesson_id],
      });
      if (lessonResult.rows.length > 0) {
        const lesson = lessonResult.rows[0] as any;
        lessonContext = `\n\nThis practice farm is for the lesson: "${lesson.title}" - ${lesson.description}`;
      }
    }

    // Get user progress level
    const progressResult = await db.execute({
      sql: 'SELECT current_level FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });
    const userLevel = progressResult.rows[0] ? (progressResult.rows[0] as any).current_level : 0;

    // Calculate native species percentage
    const nativePlantings = plantings.filter((p: any) => p.is_native === 1);
    const nativePercentage = plantings.length > 0
      ? Math.round((nativePlantings.length / plantings.length) * 100)
      : 0;

    // Analyze polyculture diversity (species layers)
    const layerCounts = plantings.reduce((acc: any, p: any) => {
      const layer = p.layer || 'unknown';
      acc[layer] = (acc[layer] || 0) + 1;
      return acc;
    }, {});

    // Build prompt for AI
    const systemPrompt = `You are a permaculture design reviewer evaluating a student's practice farm design.

Analyze the farm data provided and evaluate based on permaculture principles:
1. Zone logic and placement
2. Native species selection
3. Polyculture diversity (species layers)
4. Systems thinking application
5. Overall design quality${lessonContext}

Student experience level: Level ${userLevel}

Return your evaluation as JSON with this exact structure:
{
  "overall_score": <number 0-100>,
  "strengths": [<array of 2-4 specific strengths>],
  "improvements": [<array of 2-4 areas for improvement>],
  "specific_suggestions": [<array of 2-4 actionable suggestions with locations>],
  "principle_scores": {
    "zone_logic": <number 0-100>,
    "native_diversity": <number 0-100>,
    "polyculture_design": <number 0-100>,
    "systems_thinking": <number 0-100>
  }
}

Be encouraging but honest. Provide actionable, specific feedback.`;

    const userPrompt = `Evaluate this practice farm design:

**Farm:** ${farm.name}
${farm.description ? `**Description:** ${farm.description}\n` : ''}

**Zones (${zones.length}):**
${zones.map((z: any) => `- ${z.name || 'Unnamed'}: ${z.zone_type}`).join('\n')}

**Plantings (${plantings.length}):**
${plantings.map((p: any) =>
  `- ${p.common_name} (${p.scientific_name}) - Layer: ${p.layer}, Native: ${p.is_native ? 'Yes' : 'No'}`
).join('\n')}

**Statistics:**
- Native species: ${nativePercentage}%
- Layer diversity: ${Object.keys(layerCounts).length} different layers
- Layer distribution: ${JSON.stringify(layerCounts)}`;

    // Call AI with structured output
    const completion = await openrouter.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const feedback = JSON.parse(aiResponse);
    const now = Math.floor(Date.now() / 1000);

    // Update practice farm with grade and feedback
    await db.execute({
      sql: `
        UPDATE practice_farms
        SET ai_grade = ?, ai_feedback = ?, submitted_for_review = 1, updated_at = ?
        WHERE id = ?
      `,
      args: [
        feedback.overall_score,
        JSON.stringify(feedback),
        now,
        practiceFarmId,
      ],
    });

    // Award XP based on score (100-500 XP range)
    const xpEarned = Math.floor(100 + (feedback.overall_score / 100) * 400);

    // Update user progress
    await db.execute({
      sql: `
        UPDATE user_progress
        SET total_xp = total_xp + ?,
            current_level = CAST((total_xp + ?) / 100 AS INTEGER),
            updated_at = ?
        WHERE user_id = ?
      `,
      args: [xpEarned, xpEarned, now, session.user.id],
    });

    return Response.json({
      success: true,
      feedback,
      xp_earned: xpEarned,
    });
  } catch (error: any) {
    console.error('Error grading practice farm:', error);
    return Response.json(
      { error: 'Failed to grade practice farm', details: error.message },
      { status: 500 }
    );
  }
}
