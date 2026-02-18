import { getSession } from '@/lib/auth/session';
import { generateSpeciesContent } from '@/lib/ai/species-content-generator';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await generateSpeciesContent(params.id);

    if (result.success) {
      return Response.json({ message: 'Content generated successfully' });
    } else {
      return Response.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Content generation error:', error);
    return Response.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
