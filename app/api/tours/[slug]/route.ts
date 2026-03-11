import { db } from '@/lib/db';

// GET /api/tours/[slug] — public tour access by share slug
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const url = new URL(req.url);
  const password = url.searchParams.get('password');

  const tourResult = await db.execute({
    sql: `SELECT t.*, f.name as farm_name, f.center_lat as farm_lat, f.center_lng as farm_lng,
                 f.zoom_level as farm_zoom, f.acres as farm_acres, f.description as farm_description,
                 u.name as owner_name, u.image as owner_image
          FROM farm_tours t
          JOIN farms f ON t.farm_id = f.id
          JOIN users u ON f.user_id = u.id
          WHERE t.share_slug = ? AND t.status = 'published'`,
    args: [slug],
  });

  const tour = tourResult.rows[0] as any;
  if (!tour) return new Response('Tour not found', { status: 404 });

  // Check password protection
  if (tour.access_type === 'password') {
    if (!password || password !== tour.access_password) {
      return Response.json({
        requires_password: true,
        tour: {
          title: tour.title,
          description: tour.description,
          cover_image_url: tour.cover_image_url,
          farm_name: tour.farm_name,
          owner_name: tour.owner_name,
        },
      }, { status: 401 });
    }
  }

  // Fetch stops
  const stopsResult = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE tour_id = ? ORDER BY display_order ASC',
    args: [tour.id],
  });

  // Don't expose password in response
  const { access_password: _pw, ...safeTour } = tour;

  return Response.json({
    tour: safeTour,
    stops: stopsResult.rows,
    farm: {
      name: tour.farm_name,
      lat: tour.farm_lat,
      lng: tour.farm_lng,
      zoom: tour.farm_zoom,
      acres: tour.farm_acres,
      description: tour.farm_description,
      owner_name: tour.owner_name,
      owner_image: tour.owner_image,
    },
  });
}
