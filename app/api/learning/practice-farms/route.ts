import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PracticeFarm } from '@/lib/db/schema';

// GET /api/learning/practice-farms - List user's practice farms
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await db.execute({
    sql: `
      SELECT pf.*, l.title as lesson_title
      FROM practice_farms pf
      LEFT JOIN lessons l ON pf.lesson_id = l.id
      WHERE pf.user_id = ?
      ORDER BY pf.created_at DESC
    `,
    args: [session.user.id],
  });

  return Response.json(result.rows);
}

// POST /api/learning/practice-farms - Create practice farm
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, lesson_id, boundary_geometry, acres } = body;

    if (!name || !boundary_geometry) {
      return Response.json(
        { error: 'Missing required fields: name, boundary_geometry' },
        { status: 400 }
      );
    }

    // Calculate center from boundary geometry
    const geometry = JSON.parse(boundary_geometry);
    const coords = geometry.coordinates[0]; // First ring of polygon
    let sumLat = 0;
    let sumLng = 0;
    coords.forEach((coord: number[]) => {
      sumLng += coord[0];
      sumLat += coord[1];
    });
    const centerLng = sumLng / coords.length;
    const centerLat = sumLat / coords.length;

    const practiceFarmId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `
        INSERT INTO practice_farms (
          id, user_id, lesson_id, name, description,
          acres, boundary_geometry, center_lat, center_lng, zoom_level,
          ai_grade, ai_feedback, submitted_for_review,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?)
      `,
      args: [
        practiceFarmId,
        session.user.id,
        lesson_id || null,
        name,
        description || null,
        acres || 1,
        boundary_geometry,
        centerLat,
        centerLng,
        16, // Default zoom for practice farms
        now,
        now,
      ],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM practice_farms WHERE id = ?',
      args: [practiceFarmId],
    });

    return Response.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating practice farm:', error);
    return Response.json(
      { error: 'Failed to create practice farm' },
      { status: 500 }
    );
  }
}
