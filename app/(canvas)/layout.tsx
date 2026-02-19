import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export default async function CanvasLayout({
  children,
}: {
  children: import('react').ReactNode;
}) {
  const session = await requireAuth();

  // Fetch user's farms for the farm switcher
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
    <>
      {/* Pass farms data via a script tag for client hydration */}
      <script
        id="canvas-data"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            farms,
            userId: session.user.id,
            userName: session.user.name,
          }),
        }}
      />
      {children}
    </>
  );
}
