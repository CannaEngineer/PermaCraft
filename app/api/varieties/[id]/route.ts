import { getVarietyById, incrementVarietyPopularity } from '@/lib/varieties/variety-queries';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const varietyId = params.id;

    const variety = await getVarietyById(varietyId);

    if (!variety) {
      return Response.json({ error: 'Variety not found' }, { status: 404 });
    }

    return Response.json({ variety });
  } catch (error) {
    console.error('Get variety error:', error);
    return Response.json({ error: 'Failed to get variety' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const varietyId = params.id;

    // Increment popularity when selected
    await incrementVarietyPopularity(varietyId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Increment popularity error:', error);
    return Response.json({ error: 'Failed to track selection' }, { status: 500 });
  }
}
