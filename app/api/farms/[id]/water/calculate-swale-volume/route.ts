import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { calculateSwaleVolume } from '@/lib/water/calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.zone_id || !body.cross_section_width_feet || !body.cross_section_depth_feet) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get zone geometry (could also be a line)
  const zone = await db.execute({
    sql: 'SELECT geometry FROM zones WHERE id = ? AND farm_id = ?',
    args: [body.zone_id, farmId]
  });

  if (zone.rows.length === 0) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const geometry = JSON.parse(zone.rows[0].geometry as string);

  // Convert polygon to linestring (use boundary)
  // For MVP, assume it's already a line or use first ring
  const lineGeometry = geometry.type === 'LineString'
    ? geometry
    : { type: 'LineString', coordinates: geometry.coordinates[0] };

  const result = calculateSwaleVolume(
    lineGeometry,
    body.cross_section_width_feet,
    body.cross_section_depth_feet
  );

  // Update zone with swale properties
  await db.execute({
    sql: 'UPDATE zones SET swale_properties = ? WHERE id = ?',
    args: [
      JSON.stringify({
        is_swale: true,
        length_feet: result.lengthFeet,
        cross_section_width_feet: body.cross_section_width_feet,
        cross_section_depth_feet: body.cross_section_depth_feet,
        estimated_volume_gallons: result.volumeGallons,
        overflow_destination_id: body.overflow_destination_id || null
      }),
      body.zone_id
    ]
  });

  return NextResponse.json(result);
}
