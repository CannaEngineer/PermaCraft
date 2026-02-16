import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { calculateCatchmentCapture, calculateAreaFromGeometry } from '@/lib/water/calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  const farmId = params.id;
  const body = await request.json();

  if (!body.zone_id || !body.rainfall_inches_per_year) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get zone geometry
  const zone = await db.execute({
    sql: 'SELECT geometry FROM zones WHERE id = ? AND farm_id = ?',
    args: [body.zone_id, farmId]
  });

  if (zone.rows.length === 0) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
  }

  const geometry = JSON.parse(zone.rows[0].geometry as string);
  const areaSquareFeet = calculateAreaFromGeometry(geometry);
  
  const estimatedCaptureGallons = calculateCatchmentCapture({
    catchmentAreaSqFt: areaSquareFeet,
    annualRainfallInches: body.rainfall_inches_per_year
  });

  // Update zone with catchment properties
  await db.execute({
    sql: 'UPDATE zones SET catchment_properties = ? WHERE id = ?',
    args: [
      JSON.stringify({
        is_catchment: true,
        rainfall_inches_per_year: body.rainfall_inches_per_year,
        estimated_capture_gallons: estimatedCaptureGallons,
        destination_feature_id: body.destination_feature_id || null
      }),
      body.zone_id
    ]
  });

  return NextResponse.json({
    areaSquareFeet,
    estimatedCaptureGallons,
    rainfallInchesPerYear: body.rainfall_inches_per_year
  });
}
