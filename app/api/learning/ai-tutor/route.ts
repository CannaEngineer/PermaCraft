import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { openrouter } from '@/lib/ai/openrouter';
import { getAITutorModel } from '@/lib/ai/model-settings';

export const runtime = 'edge';

// POST /api/learning/ai-tutor - Chat with AI tutor about current lesson
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { lesson_id, message, conversation_history } = body;

    if (!lesson_id || !message) {
      return Response.json(
        { error: 'Missing required fields: lesson_id, message' },
        { status: 400 }
      );
    }

    // Get lesson details
    const lessonResult = await db.execute({
      sql: 'SELECT * FROM lessons WHERE id = ?',
      args: [lesson_id],
    });

    if (lessonResult.rows.length === 0) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = lessonResult.rows[0] as any;
    const lessonContent = JSON.parse(lesson.content);

    // Get topic details
    const topicResult = await db.execute({
      sql: 'SELECT * FROM topics WHERE id = ?',
      args: [lesson.topic_id],
    });
    const topic = topicResult.rows[0] as any;

    // Get user progress level
    const progressResult = await db.execute({
      sql: 'SELECT current_level, total_xp FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });
    const userLevel = progressResult.rows[0]
      ? (progressResult.rows[0] as any).current_level
      : 0;

    // Get completed lessons count
    const completedResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM lesson_completions WHERE user_id = ?',
      args: [session.user.id],
    });
    const completedLessons = (completedResult.rows[0] as any).count;

    // Build system prompt
    const systemPrompt = `You are a knowledgeable permaculture tutor helping a student learn about "${lesson.title}".

Lesson topic: ${topic.name}
Lesson description: ${lesson.description}

Student profile:
- Experience level: Level ${userLevel}
- Completed lessons: ${completedLessons}

Guidelines:
- Answer questions clearly and concisely (2-4 paragraphs max)
- Provide specific, actionable examples when relevant
- Connect concepts to permaculture ethics (Earth Care, People Care, Fair Share) and principles
- If question is outside current lesson scope, briefly answer then suggest they explore the relevant lesson
- Encourage hands-on practice and experimentation
- Be supportive and encouraging, especially for beginners
- Use simple language for low-level users, more technical detail for advanced users
- Reference native species and ecological principles when relevant

Current lesson core concepts:
${lessonContent.core_content.substring(0, 500)}...`;

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []),
      { role: 'user', content: message },
    ];

    // Get model for AI tutor
    const tutorModel = await getAITutorModel();

    // Stream response from AI
    const completion = await openrouter.chat.completions.create({
      model: tutorModel,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

    // Create readable stream for response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in AI tutor:', error);
    return Response.json(
      { error: 'Failed to get response from AI tutor', details: error.message },
      { status: 500 }
    );
  }
}
