import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { openrouter } from '@/lib/ai/openrouter';

// GET /api/learning/lessons/[slug]/personalize - Get AI-personalized lesson content
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const lessonSlug = params.slug;

  try {
    // Get lesson
    const lessonResult = await db.execute({
      sql: 'SELECT * FROM lessons WHERE slug = ?',
      args: [lessonSlug],
    });

    if (lessonResult.rows.length === 0) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = lessonResult.rows[0] as any;
    const lessonContent = JSON.parse(lesson.content);

    // Get user's farms to understand their context
    const farmsResult = await db.execute({
      sql: 'SELECT * FROM farms WHERE user_id = ? LIMIT 1',
      args: [session.user.id],
    });

    const userFarm = farmsResult.rows[0] as any;

    // Get user progress level
    const progressResult = await db.execute({
      sql: 'SELECT current_level, total_xp FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });
    const progress = progressResult.rows[0] as any;

    // Build user context
    const userContext = {
      level: progress?.current_level || 0,
      totalXp: progress?.total_xp || 0,
      hasProperty: !!userFarm,
      propertySize: userFarm?.acres || null,
      propertyName: userFarm?.name || null,
      climateZone: userFarm?.climate_zone || 'temperate',
    };

    // Build personalization prompt
    const systemPrompt = `You are a permaculture education assistant. Your task is to add 2-3 personalized callout boxes to this lesson content based on the student's context.

Student Context:
- Experience Level: Level ${userContext.level}
- ${userContext.hasProperty ? `Property: ${userContext.propertySize} acres (${userContext.propertyName})` : 'No property yet (planning stage)'}
- Climate Zone: ${userContext.climateZone}

Guidelines:
1. Add specific, actionable examples relevant to their climate and property size
2. Suggest native species when mentioning plants
3. Adapt scenarios to their property size
4. Use encouraging language appropriate to their experience level
5. Return JSON with "callouts" array containing 2-3 callout objects

Each callout should have:
- "placement": "after_paragraph_X" (where X is paragraph number, starting from 0)
- "type": "climate" | "property" | "species" | "example"
- "title": brief title for the callout
- "content": 2-3 sentences of personalized advice

Base lesson content:
${lessonContent.core_content}`;

    const completion = await openrouter.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Generate personalized callouts for this lesson.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const personalization = JSON.parse(aiResponse);

    return Response.json({
      lesson: {
        ...lesson,
        content: lessonContent,
      },
      personalization: personalization.callouts || [],
      userContext,
    });
  } catch (error: any) {
    console.error('Error personalizing lesson:', error);
    return Response.json(
      {
        error: 'Failed to personalize lesson',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
