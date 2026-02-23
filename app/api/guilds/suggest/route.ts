import { NextRequest, NextResponse } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { requireAuth } from '@/lib/auth/session';
import { buildGuildSuggestionPrompt } from '@/lib/ai/guild-prompter';

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  const body = await request.json();

  if (!body.focalSpecies || !body.farmContext) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    const prompt = buildGuildSuggestionPrompt({
      focalSpecies: body.focalSpecies,
      farmContext: body.farmContext,
      constraints: body.constraints
    });

    const completion = await openrouter.chat.completions.create({
      model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
      messages: [
        {
          role: 'system',
          content: 'You are a permaculture expert. Always respond with valid JSON. Do not wrap your response in markdown code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const responseText = completion.choices[0].message.content || '{}';

    // Try direct JSON parse first, then fall back to extracting JSON from markdown
    let guildSuggestion;
    try {
      guildSuggestion = JSON.parse(responseText);
    } catch {
      // Model may have wrapped JSON in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        guildSuggestion = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find a JSON object in the response
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          guildSuggestion = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse JSON from AI response');
        }
      }
    }

    return NextResponse.json({
      suggestion: guildSuggestion,
      model: completion.model,
      usage: completion.usage
    });
  } catch (error: any) {
    console.error('Failed to generate guild suggestion:', error);
    return NextResponse.json(
      { error: 'AI suggestion failed', message: error.message },
      { status: 500 }
    );
  }
}
