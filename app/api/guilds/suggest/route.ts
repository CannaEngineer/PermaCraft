import { NextRequest, NextResponse } from 'next/server';
import { openrouter } from '@/lib/ai/openrouter';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { buildGuildSuggestionPrompt } from '@/lib/ai/guild-prompter';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
          content: 'You are a permaculture expert. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content;
    const guildSuggestion = JSON.parse(responseText || '{}');

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
