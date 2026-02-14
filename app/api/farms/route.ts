import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { centroid } from '@turf/centroid';
import { bbox } from '@turf/bbox';
import type { Polygon } from 'geojson';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { name, description, acres, boundary_geometry } = body;

    if (!name || !boundary_geometry) {
      return Response.json({ error: "Name and boundary are required" }, { status: 400 });
    }

    // Parse boundary geometry
    const geometry: Polygon = JSON.parse(boundary_geometry);

    // Calculate center point from boundary centroid
    const center = centroid({
      type: "Feature",
      properties: {},
      geometry: geometry
    });

    const [center_lng, center_lat] = center.geometry.coordinates;

    // Calculate zoom level to fit boundary
    const [west, south, east, north] = bbox({
      type: "Feature",
      properties: {},
      geometry: geometry
    });

    // Rough zoom calculation based on bounds
    const latDiff = north - south;
    const lngDiff = east - west;
    const maxDiff = Math.max(latDiff, lngDiff);
    const zoom_level = Math.min(18, Math.max(10, Math.floor(14 - Math.log2(maxDiff * 100))));

    const farmId = crypto.randomUUID();

    // Create farm
    await db.execute({
      sql: `INSERT INTO farms (id, user_id, name, description, acres, center_lat, center_lng, zoom_level, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [farmId, session.user.id, name, description, acres, center_lat, center_lng, zoom_level, 0],
    });

    // Create farm boundary zone
    const boundaryZoneId = crypto.randomUUID();
    const areaAcres = acres || 0;
    const areaHectares = areaAcres * 0.404686;

    await db.execute({
      sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        boundaryZoneId,
        farmId,
        'farm_boundary',
        JSON.stringify(geometry),
        JSON.stringify({
          name: 'Farm Boundary',
          area_acres: areaAcres,
          area_hectares: areaHectares
        })
      ],
    });

    // Create default design layers
    const defaultLayers = [
      { name: 'Water Systems', color: '#0ea5e980' },
      { name: 'Plantings', color: '#22c55e80' },
      { name: 'Structures', color: '#ef444480' },
      { name: 'Zones', color: '#eab30880' },
      { name: 'Annotations', color: '#a855f780' },
    ];

    for (let i = 0; i < defaultLayers.length; i++) {
      const { name, color } = defaultLayers[i];
      await db.execute({
        sql: `INSERT INTO design_layers (id, farm_id, name, color, display_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), farmId, name, color, i]
      });
    }

    return Response.json({ id: farmId, message: "Farm created successfully" });
  } catch (error) {
    console.error("Failed to create farm:", error);
    return Response.json({ error: "Failed to create farm" }, { status: 500 });
  }
}
