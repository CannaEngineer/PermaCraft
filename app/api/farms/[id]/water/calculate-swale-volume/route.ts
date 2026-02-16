import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { calculateSwaleCapacity } from '@/lib/water/calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  const farmId = params.id;
  const body = await request.json();

  if (!body.zone_id || !body.length_feet || !body.width_feet || !body.depth_feet) {
    return NextResponse.json(
      { error: 'Missing required fields: zone_id, length_feet, width_feet, depth_feet' },
      { status: 400 }
    );
  }

  const estimatedVolumeGallons = calculateSwaleCapacity({
    lengthFeet: body.length_feet,
    widthFeet: body.width_feet,
    depthFeet: body.depth_feet
  });

  // Update zone with swale properties
  await db.execute({
    sql: 'UPDATE zones SET swale_properties = ? WHERE id = ?',
    args: [
      JSON.stringify({
        is_swale: true,
        length_feet: body.length_feet,
        cross_section_width_feet: body.width_feet,
        cross_section_depth_feet: body.depth_feet,
        estimated_volume_gallons: estimatedVolumeGallons,
        overflow_destination_id: body.overflow_destination_id || null
      }),
      body.zone_id
    ]
  });

  return NextResponse.json({
    lengthFeet: body.length_feet,
    widthFeet: body.width_feet,
    depthFeet: body.depth_feet,
    estimatedVolumeGallons
  });
}
