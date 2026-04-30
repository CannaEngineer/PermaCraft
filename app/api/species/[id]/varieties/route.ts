import { requireAuth } from '@/lib/auth/session';
import { getVarietiesBySpecies, createVariety } from '@/lib/varieties/variety-queries';

const VALID_VARIETY_TYPES = new Set([
  'cultivar', 'hybrid', 'heirloom', 'wild_selection',
]);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const speciesId = params.id;
    const url = new URL(request.url);

    // ?parent_variety_id=<id>  → fetch sub-varieties of a specific variety
    // ?parent_variety_id=null  → explicitly request top-level varieties
    // (omit)                   → top-level varieties (default)
    const parentParam = url.searchParams.get('parent_variety_id');
    const farmId = url.searchParams.get('farm_id') || undefined;

    let userId: string | undefined;
    try {
      const session = await requireAuth();
      userId = session.user.id;
    } catch {
      // Unauthenticated callers get the global catalog only — no customs.
    }

    const options: Parameters<typeof getVarietiesBySpecies>[1] = {};
    if (parentParam !== null) {
      options.parentVarietyId = parentParam === 'null' ? null : parentParam;
    }
    if (userId) options.userId = userId;
    if (farmId) options.farmId = farmId;

    const varieties = await getVarietiesBySpecies(speciesId, options);
    return Response.json({ varieties });
  } catch (error) {
    console.error('Get varieties error:', error);
    return Response.json({ error: 'Failed to get varieties' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const speciesId = params.id;

    const body = await request.json();
    const {
      variety_name,
      parent_variety_id,
      variety_type,
      description,
      notes,
      farm_id,
    } = body as {
      variety_name?: string;
      parent_variety_id?: string | null;
      variety_type?: string;
      description?: string;
      notes?: string;
      farm_id?: string;
    };

    if (!variety_name || !variety_name.trim()) {
      return Response.json({ error: 'variety_name is required' }, { status: 400 });
    }
    if (variety_type && !VALID_VARIETY_TYPES.has(variety_type)) {
      return Response.json(
        { error: `variety_type must be one of: ${Array.from(VALID_VARIETY_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    const variety = await createVariety({
      speciesId,
      varietyName: variety_name,
      parentVarietyId: parent_variety_id || null,
      varietyType: (variety_type as 'cultivar' | 'hybrid' | 'heirloom' | 'wild_selection' | undefined),
      description: description || null,
      notes: notes || null,
      isCustom: true,
      createdByUserId: session.user.id,
      farmId: farm_id || null,
    });

    return Response.json({ variety }, { status: 201 });
  } catch (error) {
    console.error('Create variety error:', error);
    return Response.json({ error: 'Failed to create variety' }, { status: 500 });
  }
}
