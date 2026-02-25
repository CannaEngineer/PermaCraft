import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await requireAuth();

  const body = await request.json();

  if (!body.name || !body.focal_species_id || !body.companion_species) {
    return Response.json(
      { error: 'Missing required fields: name, focal_species_id, companion_species' },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();

  try {
    await db.execute({
      sql: `INSERT INTO guild_templates
            (id, name, description, focal_species_id, companion_species, benefits, is_public, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.name,
        body.description || null,
        body.focal_species_id,
        typeof body.companion_species === 'string'
          ? body.companion_species
          : JSON.stringify(body.companion_species),
        body.benefits ? JSON.stringify(body.benefits) : null,
        body.is_public ? 1 : 0,
        session.user.id,
      ],
    });

    return Response.json({
      guild: {
        id,
        name: body.name,
        focal_species_id: body.focal_species_id,
        companion_species: body.companion_species,
        created_by: session.user.id,
      }
    });
  } catch (error) {
    console.error('Failed to save guild template:', error);
    return Response.json({ error: 'Failed to save guild' }, { status: 500 });
  }
}
