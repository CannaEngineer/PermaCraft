import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { CanvasClient } from './canvas-client';

export default async function CanvasPage() {
  const session = await requireAuth();

  const result = await db.execute({
    sql: `SELECT id, user_id, name, description, acres, climate_zone, rainfall_inches,
                 soil_type, center_lat, center_lng, zoom_level, is_public, created_at, updated_at
          FROM farms
          WHERE user_id = ?
          ORDER BY updated_at DESC`,
    args: [session.user.id],
  });

  const farms = result.rows as any[];

  return (
    <CanvasClient
      farms={farms}
      userId={session.user.id}
      userName={session.user.name}
    />
  );
}
