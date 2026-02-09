import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { openrouter } from '@/lib/ai/openrouter';

// POST /api/admin/content/generate - Generate a new lesson with AI
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const {
      topic_id,
      title,
      difficulty,
      estimated_minutes,
      learning_objectives,
      key_concepts,
      quiz_count,
    } = body;

    // Validate required fields
    if (!topic_id || !title || !difficulty || !estimated_minutes || !learning_objectives || !key_concepts) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get topic info
    const topicResult = await db.execute({
      sql: 'SELECT * FROM topics WHERE id = ?',
      args: [topic_id],
    });

    if (topicResult.rows.length === 0) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    const topic = topicResult.rows[0] as any;

    // Calculate target word count based on reading time
    const targetWords = Math.floor(estimated_minutes * 80); // ~80 words per minute

    // Build AI prompt
    const systemPrompt = `You are an expert permaculture educator creating lesson content for PermaCraft, an educational platform.

CRITICAL REQUIREMENTS:
1. Follow permaculture ethics: Earth Care, People Care, Fair Share
2. Connect concepts to the 12 permaculture principles where relevant
3. Use scientific names for all plants: Common Name (Genus species)
4. Mark native status clearly when mentioning plants
5. Include practical, actionable examples students can apply
6. Write at the ${difficulty} level
7. Target length: ~${targetWords} words
8. Create exactly ${quiz_count} quiz questions (if quiz_count > 0)

OUTPUT FORMAT - Return valid JSON with this exact structure:
{
  "core_content": "Full lesson content in markdown format. Use ## for headings, ### for subheadings. Include practical examples, bullet points for key concepts, and real-world applications.",
  "quiz": [
    {
      "question": "Clear, specific question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct": 0,
      "explanation": "Why this answer is correct and what students should learn from it"
    }
  ],
  "source_attribution": "Based on established permaculture principles and practices",
  "license": "CC BY-NC-SA",
  "images": [
    {
      "description": "Description of what image/diagram would be helpful here",
      "placement": "after_section_X"
    }
  ]
}

QUALITY STANDARDS:
- Use clear, engaging language appropriate for ${difficulty} level
- Include 3-5 concrete examples
- Break complex ideas into digestible sections
- Use analogies to explain abstract concepts
- End with actionable next steps or practice suggestions
- Quiz questions should test understanding, not just memorization`;

    const userPrompt = `Generate a permaculture lesson with these specifications:

**Topic:** ${topic.name}
**Title:** ${title}
**Difficulty:** ${difficulty}
**Duration:** ${estimated_minutes} minutes

**Learning Objectives:**
${learning_objectives}

**Key Concepts to Cover:**
${key_concepts}

**Quiz Questions:** ${quiz_count}

Generate comprehensive, engaging lesson content that achieves these learning objectives and covers all key concepts.`;

    // Call AI
    const completion = await openrouter.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const generatedContent = JSON.parse(aiResponse);

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Calculate XP reward based on difficulty and length
    const baseXP = {
      beginner: 20,
      intermediate: 30,
      advanced: 40,
    }[difficulty] || 20;

    const xpReward = Math.floor(baseXP + (estimated_minutes / 15) * 10);

    // Save generation to database
    const generationId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO content_generations
            (id, topic_id, generated_by_user_id, input_prompt, ai_model, raw_output,
             status, title, slug, difficulty, estimated_minutes, xp_reward)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        generationId,
        topic_id,
        session.user.id,
        JSON.stringify({ learning_objectives, key_concepts }),
        'openai/gpt-oss-120b',
        aiResponse,
        'draft',
        title,
        slug,
        difficulty,
        estimated_minutes,
        xpReward,
      ],
    });

    return Response.json({
      success: true,
      generation_id: generationId,
      content: generatedContent,
    });
  } catch (error: any) {
    console.error('Content generation error:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: 403 });
    }

    return Response.json(
      { error: 'Failed to generate lesson', details: error.message },
      { status: 500 }
    );
  }
}
