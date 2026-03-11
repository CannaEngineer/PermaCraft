import { NextRequest } from 'next/server';
import { getTourComments, createTourComment, getTourPoiById } from '@/lib/tour/queries';
import { checkRateLimit } from '@/lib/tour/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await getTourComments(id, 'approved');
    return Response.json({ comments });
  } catch (error) {
    console.error('Failed to fetch tour comments:', error);
    return Response.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-comment:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { content, session_id } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return Response.json({ error: 'Comment too long (max 1000 characters)' }, { status: 400 });
    }

    const poi = await getTourPoiById(id);
    if (!poi) {
      return Response.json({ error: 'POI not found' }, { status: 404 });
    }

    const comment = await createTourComment({
      poi_id: id,
      farm_id: poi.farm_id,
      session_id: session_id || null,
      content: content.trim(),
    });

    return Response.json({ comment });
  } catch (error) {
    console.error('Failed to create tour comment:', error);
    return Response.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
