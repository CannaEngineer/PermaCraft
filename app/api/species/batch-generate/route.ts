import { batchGenerateSpeciesContent } from '@/lib/ai/species-content-generator';

export async function POST(request: Request) {
  // Auth via cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(body.limit || 5, 20);

    const result = await batchGenerateSpeciesContent(limit);

    return Response.json({
      message: `Generated content for ${result.generated} species, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    return Response.json(
      { error: 'Batch generation failed' },
      { status: 500 }
    );
  }
}
