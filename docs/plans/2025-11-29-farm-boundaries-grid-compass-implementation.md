# Farm Boundaries, Grid, and Compass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add farm boundary drawing during creation, measurement grid overlay, and compass rose for spatial context.

**Architecture:** Three independent features: (1) BoundaryDrawer component for farm creation with polygon validation and area calculation, (2) MeasurementGrid layer added to FarmMap using MapLibre GeoJSON sources, (3) CompassRose SVG component overlaid on maps.

**Tech Stack:** React, TypeScript, MapLibre GL, Mapbox GL Draw, Turf.js (geospatial calculations)

---

## Task 1: Install Turf.js for Geospatial Calculations

**Files:**
- Modify: `package.json`

**Step 1: Install Turf.js**

Run: `npm install @turf/turf @turf/area @turf/centroid @turf/bbox`

Expected: Package installed successfully

**Step 2: Verify installation**

Run: `npm list @turf/turf`

Expected: Shows @turf/turf version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add turf.js for geospatial calculations"
```

---

## Task 2: Create CompassRose Component (Easiest First)

**Files:**
- Create: `components/map/compass-rose.tsx`

**Step 1: Create CompassRose component**

```tsx
"use client";

export function CompassRose() {
  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        className="drop-shadow-lg"
      >
        {/* Background circle */}
        <circle
          cx="30"
          cy="30"
          r="28"
          fill="white"
          fillOpacity="0.9"
          stroke="black"
          strokeWidth="1"
        />

        {/* North arrow */}
        <polygon
          points="30,8 26,20 34,20"
          fill="#dc2626"
        />

        {/* Cardinal directions */}
        <text
          x="30"
          y="18"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="black"
        >
          N
        </text>
        <text
          x="30"
          y="52"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          S
        </text>
        <text
          x="10"
          y="35"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          W
        </text>
        <text
          x="50"
          y="35"
          textAnchor="middle"
          fontSize="11"
          fill="black"
        >
          E
        </text>

        {/* Cross lines */}
        <line x1="30" y1="5" x2="30" y2="55" stroke="black" strokeWidth="0.5" opacity="0.3"/>
        <line x1="5" y1="30" x2="55" y2="30" stroke="black" strokeWidth="0.5" opacity="0.3"/>
      </svg>
    </div>
  );
}
```

**Step 2: Add to FarmMap component**

Modify: `components/map/farm-map.tsx:524` (before closing </div>)

Add:
```tsx
import { CompassRose } from "./compass-rose";

// In return statement, add before final </div>:
<CompassRose />
```

**Step 3: Test visually**

1. Run dev server
2. Navigate to farm editor
3. Verify compass appears in bottom-left
4. Check it's visible on all map layers

**Step 4: Commit**

```bash
git add components/map/compass-rose.tsx components/map/farm-map.tsx
git commit -m "feat: add compass rose to farm map"
```

---

## Task 3: Create Measurement Grid Utility Functions

**Files:**
- Create: `lib/map/measurement-grid.ts`

**Step 1: Create grid generation utility**

```typescript
import type { Feature, LineString, Point } from 'geojson';

export type GridUnit = 'imperial' | 'metric';

interface GridInterval {
  value: number;
  unit: string;
}

/**
 * Get appropriate grid interval based on zoom level and unit system
 */
export function getGridInterval(zoom: number, unit: GridUnit): GridInterval {
  if (unit === 'imperial') {
    if (zoom >= 19) return { value: 50, unit: 'ft' };
    if (zoom >= 17) return { value: 100, unit: 'ft' };
    if (zoom >= 15) return { value: 250, unit: 'ft' };
    if (zoom >= 13) return { value: 500, unit: 'ft' };
    return { value: 1000, unit: 'ft' };
  } else {
    if (zoom >= 19) return { value: 25, unit: 'm' };
    if (zoom >= 17) return { value: 50, unit: 'm' };
    if (zoom >= 15) return { value: 100, unit: 'm' };
    if (zoom >= 13) return { value: 250, unit: 'm' };
    return { value: 500, unit: 'm' };
  }
}

/**
 * Convert feet to meters
 */
function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

/**
 * Calculate degrees of latitude/longitude for given distance in meters
 */
function metersToDegreesLat(meters: number): number {
  return meters / 111320; // 1 degree latitude ≈ 111.32km
}

function metersToDegreesLng(meters: number, latitude: number): number {
  return meters / (111320 * Math.cos(latitude * Math.PI / 180));
}

/**
 * Generate grid lines for map bounds
 */
export function generateGridLines(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  zoom: number,
  unit: GridUnit
): { lines: Feature<LineString>[], labels: Feature<Point>[] } {
  const interval = getGridInterval(zoom, unit);
  const intervalMeters = unit === 'imperial'
    ? feetToMeters(interval.value)
    : interval.value;

  const centerLat = (bounds.north + bounds.south) / 2;

  const latStep = metersToDegreesLat(intervalMeters);
  const lngStep = metersToDegreesLng(intervalMeters, centerLat);

  // Add 20% buffer
  const latBuffer = (bounds.north - bounds.south) * 0.2;
  const lngBuffer = (bounds.east - bounds.west) * 0.2;

  const north = bounds.north + latBuffer;
  const south = bounds.south - latBuffer;
  const east = bounds.east + lngBuffer;
  const west = bounds.west - lngBuffer;

  const lines: Feature<LineString>[] = [];
  const labels: Feature<Point>[] = [];

  // Generate latitude lines (horizontal)
  let count = 0;
  for (let lat = Math.floor(south / latStep) * latStep; lat <= north && count < 50; lat += latStep) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[west, lat], [east, lat]]
      }
    });
    count++;
  }

  // Generate longitude lines (vertical)
  count = 0;
  for (let lng = Math.floor(west / lngStep) * lngStep; lng <= east && count < 50; lng += lngStep) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[lng, south], [lng, north]]
      }
    });
    count++;
  }

  // Generate labels at grid intersections (only at major intervals)
  const majorInterval = interval.value * 2;
  const majorLatStep = latStep * 2;
  const majorLngStep = lngStep * 2;

  count = 0;
  for (let lat = Math.floor(south / majorLatStep) * majorLatStep; lat <= north && count < 25; lat += majorLatStep) {
    for (let lng = Math.floor(west / majorLngStep) * majorLngStep; lng <= east && count < 25; lng += majorLngStep) {
      labels.push({
        type: 'Feature',
        properties: {
          label: `${majorInterval} ${interval.unit}`
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
      count++;
    }
  }

  return { lines, labels };
}
```

**Step 2: Commit**

```bash
git add lib/map/measurement-grid.ts
git commit -m "feat: add measurement grid utility functions"
```

---

## Task 4: Add Measurement Grid to FarmMap Component

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add state for grid unit**

At line 24 (after mapLayer state):

```typescript
const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>('imperial');
```

**Step 2: Import grid utilities**

At top of file:

```typescript
import { generateGridLines, type GridUnit } from '@/lib/map/measurement-grid';
import type { FeatureCollection, LineString, Point } from 'geojson';
```

**Step 3: Add grid layer initialization**

Inside the map initialization useEffect (after addControl for NavigationControl, around line 152):

```typescript
// Add grid source and layers
map.current.on('load', () => {
  if (!map.current) return;

  // Add grid line source
  map.current.addSource('grid-lines', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // Add grid line layer
  map.current.addLayer({
    id: 'grid-lines-layer',
    type: 'line',
    source: 'grid-lines',
    paint: {
      'line-color': '#ffffff',
      'line-width': 1,
      'line-opacity': 0.2
    }
  });

  // Add grid label source
  map.current.addSource('grid-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // Add grid label layer
  map.current.addLayer({
    id: 'grid-labels-layer',
    type: 'symbol',
    source: 'grid-labels',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 10,
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular']
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1
    }
  });

  // Initial grid update
  updateGrid();
});
```

**Step 4: Add updateGrid function**

Before the return statement:

```typescript
const updateGrid = () => {
  if (!map.current) return;

  const bounds = map.current.getBounds();
  const zoom = map.current.getZoom();

  const { lines, labels } = generateGridLines(
    {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    },
    zoom,
    gridUnit
  );

  const gridLineSource = map.current.getSource('grid-lines') as maplibregl.GeoJSONSource;
  const gridLabelSource = map.current.getSource('grid-labels') as maplibregl.GeoJSONSource;

  if (gridLineSource) {
    gridLineSource.setData({
      type: 'FeatureCollection',
      features: lines
    });
  }

  if (gridLabelSource) {
    gridLabelSource.setData({
      type: 'FeatureCollection',
      features: labels
    });
  }
};
```

**Step 5: Add event listeners for grid updates**

In the map initialization useEffect (after grid layer setup):

```typescript
// Update grid on zoom/move end
map.current.on('moveend', updateGrid);
map.current.on('zoomend', updateGrid);
```

**Step 6: Add useEffect for grid unit changes**

After the zones useEffect:

```typescript
// Update grid when unit changes
useEffect(() => {
  updateGrid();
}, [gridUnit]);
```

**Step 7: Add grid unit toggle button**

In the return JSX, after the layer menu div (around line 433):

```tsx
{/* Grid Unit Toggle */}
<div className="absolute top-20 left-4 z-10">
  <Button
    onClick={() => setGridUnit(gridUnit === 'imperial' ? 'metric' : 'imperial')}
    variant="secondary"
    size="sm"
    className="bg-white shadow-lg"
  >
    {gridUnit === 'imperial' ? 'Feet' : 'Meters'} ⟷
  </Button>
</div>
```

**Step 8: Update cleanup in useEffect return**

Add to the cleanup function:

```typescript
if (map.current) {
  map.current.off('moveend', updateGrid);
  map.current.off('zoomend', updateGrid);
  map.current.remove();
  map.current = null;
}
```

**Step 9: Re-add grid after style change**

In the `changeMapLayer` function, inside the `style.load` event (around line 353):

```typescript
map.current.once("style.load", () => {
  if (draw.current && map.current) {
    // Re-add draw features
    const features = draw.current.getAll().features;
    draw.current.deleteAll();
    features.forEach((feature) => {
      draw.current!.add(feature);
    });

    // Re-add grid layers
    if (!map.current.getSource('grid-lines')) {
      map.current.addSource('grid-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.current.addLayer({
        id: 'grid-lines-layer',
        type: 'line',
        source: 'grid-lines',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1,
          'line-opacity': 0.2
        }
      });

      map.current.addSource('grid-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.current.addLayer({
        id: 'grid-labels-layer',
        type: 'symbol',
        source: 'grid-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular']
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });

      updateGrid();
    }
  }
});
```

**Step 10: Test grid**

1. Run dev server
2. Open farm editor
3. Verify grid appears
4. Zoom in/out - grid should rescale
5. Toggle feet/meters - intervals should change
6. Change map layers - grid should persist

**Step 11: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat: add measurement grid overlay to farm map"
```

---

## Task 5: Create BoundaryDrawer Component

**Files:**
- Create: `components/map/boundary-drawer.tsx`

**Step 1: Create BoundaryDrawer component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area } from "@turf/area";
import type { Feature, Polygon } from "geojson";

interface BoundaryDrawerProps {
  onBoundaryComplete: (boundary: Feature<Polygon>, areaAcres: number) => void;
}

export function BoundaryDrawer({ onBoundaryComplete }: BoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [areaAcres, setAreaAcres] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map centered on US
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
          },
        ],
      },
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      maxZoom: 20,
      minZoom: 1,
    });

    // Add geocoder search (users can search for their location)
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Initialize drawing in polygon mode
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
      styles: [
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "fill-color": "#16a34a",
            "fill-opacity": 0.3,
          },
        },
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "line-color": "#16a34a",
            "line-width": 3,
          },
        },
        {
          id: "gl-draw-polygon-and-line-vertex",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["!=", "mode", "static"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#fff",
            "circle-stroke-color": "#16a34a",
            "circle-stroke-width": 2,
          },
        },
      ],
    });

    map.current.addControl(draw.current as any, "top-right");

    // Listen for polygon creation
    const handleCreate = (e: any) => {
      const features = draw.current!.getAll().features;
      if (features.length > 0) {
        const feature = features[0] as Feature<Polygon>;

        // Calculate area in square meters
        const areaSquareMeters = area(feature);
        // Convert to acres (1 acre = 4046.86 square meters)
        const acres = areaSquareMeters / 4046.86;

        setAreaAcres(acres);
        setIsComplete(true);
        onBoundaryComplete(feature, acres);

        // Zoom to fit boundary
        const coordinates = feature.geometry.coordinates[0];
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord as [number, number]);
        }, new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));

        map.current?.fitBounds(bounds, { padding: 50 });
      }
    };

    const handleUpdate = (e: any) => {
      const features = draw.current!.getAll().features;
      if (features.length > 0) {
        const feature = features[0] as Feature<Polygon>;
        const areaSquareMeters = area(feature);
        const acres = areaSquareMeters / 4046.86;
        setAreaAcres(acres);
        onBoundaryComplete(feature, acres);
      }
    };

    const handleDelete = (e: any) => {
      setAreaAcres(null);
      setIsComplete(false);
    };

    map.current.on("draw.create", handleCreate);
    map.current.on("draw.update", handleUpdate);
    map.current.on("draw.delete", handleDelete);

    return () => {
      if (draw.current) {
        draw.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onBoundaryComplete]);

  return (
    <div className="relative">
      <div ref={mapContainer} className="h-[400px] w-full rounded-lg overflow-hidden" />

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold mb-2">Draw Your Farm Boundary</h3>
        <ol className="text-sm space-y-1 text-gray-700">
          <li>1. Search or pan to find your property</li>
          <li>2. Click the polygon tool (top-right)</li>
          <li>3. Click points around your property boundary</li>
          <li>4. Double-click the last point to finish</li>
        </ol>
        {areaAcres !== null && (
          <div className="mt-3 pt-3 border-t">
            <p className="font-semibold text-green-600">
              Area: {areaAcres.toFixed(2)} acres
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ({(areaAcres * 0.404686).toFixed(2)} hectares)
            </p>
          </div>
        )}
      </div>

      {/* Validation badge */}
      {isComplete && (
        <div className="absolute bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
          ✓ Boundary Complete
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/map/boundary-drawer.tsx
git commit -m "feat: create boundary drawer component for farm creation"
```

---

## Task 6: Integrate BoundaryDrawer into Farm Creation

**Files:**
- Modify: `app/(app)/farm/new/page.tsx`
- Modify: `app/api/farms/route.ts`

**Step 1: Update farm creation page to use BoundaryDrawer**

Modify `app/(app)/farm/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BoundaryDrawer } from "@/components/map/boundary-drawer";
import type { Feature, Polygon } from "geojson";

export default function NewFarmPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState("");
  const [boundary, setBoundary] = useState<{ feature: Feature<Polygon>; areaAcres: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleBoundaryComplete = (feature: Feature<Polygon>, areaAcres: number) => {
    setBoundary({ feature, areaAcres });
    // Auto-fill acres if not entered
    if (!acres) {
      setAcres(areaAcres.toFixed(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!boundary) {
      setError("Please draw your farm boundary on the map");
      return;
    }

    // Validate area mismatch
    if (acres && Math.abs(parseFloat(acres) - boundary.areaAcres) / boundary.areaAcres > 0.2) {
      const confirmed = confirm(
        `The drawn boundary (${boundary.areaAcres.toFixed(1)} acres) differs from the entered size (${acres} acres) by more than 20%. Continue anyway?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          acres: acres ? parseFloat(acres) : boundary.areaAcres,
          boundary_geometry: JSON.stringify(boundary.feature.geometry),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create farm");
      }

      const data = await res.json();
      router.push(`/farm/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Farm</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Farm Details</CardTitle>
            <CardDescription>Basic information about your farm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Farm Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Permaculture Farm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your farm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acres">Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                step="0.1"
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
                placeholder="Will auto-fill from boundary"
              />
              <p className="text-xs text-muted-foreground">
                Optional - will use calculated area from boundary if not entered
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Farm Boundary *</CardTitle>
            <CardDescription>Draw the boundary of your property</CardDescription>
          </CardHeader>
          <CardContent>
            <BoundaryDrawer onBoundaryComplete={handleBoundaryComplete} />
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !boundary}>
            {loading ? "Creating..." : "Create Farm"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Update farms API to handle boundary**

Modify `app/api/farms/route.ts`:

Import turf at top:
```typescript
import { centroid } from '@turf/centroid';
import { bbox } from '@turf/bbox';
import type { Polygon } from 'geojson';
```

Update POST handler around line 20:
```typescript
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

    return Response.json({ id: farmId, message: "Farm created successfully" });
  } catch (error) {
    console.error("Failed to create farm:", error);
    return Response.json({ error: "Failed to create farm" }, { status: 500 });
  }
}
```

**Step 3: Test farm creation flow**

1. Run dev server
2. Navigate to `/farm/new`
3. Fill in farm details
4. Draw boundary on map
5. Verify area calculates correctly
6. Create farm
7. Verify redirects to farm editor
8. Verify boundary appears on map

**Step 4: Commit**

```bash
git add app/(app)/farm/new/page.tsx app/api/farms/route.ts
git commit -m "feat: integrate boundary drawing into farm creation flow"
```

---

## Task 7: Add Compass to Location Picker

**Files:**
- Modify: `components/map/location-picker.tsx`

**Step 1: Add CompassRose to LocationPicker**

At top:
```typescript
import { CompassRose } from "./compass-rose";
```

In return JSX, before closing div:
```tsx
<CompassRose />
```

**Step 2: Commit**

```bash
git add components/map/location-picker.tsx
git commit -m "feat: add compass to location picker"
```

---

## Task 8: Style Farm Boundary Distinctly in Editor

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add special styling for farm_boundary zones**

In the zones loading useEffect (around line 245), wrap the add logic:

```typescript
zones.forEach((zone) => {
  try {
    const geometry = typeof zone.geometry === "string"
      ? JSON.parse(zone.geometry)
      : zone.geometry;
    const properties = typeof zone.properties === "string"
      ? JSON.parse(zone.properties || "{}")
      : (zone.properties || {});

    // Add zone to draw control
    const feature = {
      id: zone.id,
      type: "Feature" as const,
      geometry: geometry,
      properties: {
        ...properties,
        zone_type: zone.zone_type
      },
    };

    draw.current!.add(feature);

    // If this is farm boundary, make it non-editable by switching to simple_select
    if (zone.zone_type === 'farm_boundary') {
      draw.current!.changeMode('simple_select');
    }
  } catch (error) {
    console.error("Failed to parse zone data:", error, zone);
  }
});
```

**Step 2: Add custom MapboxDraw styles for farm_boundary**

Update the draw styles in initialization (around line 93):

```typescript
styles: [
  // Farm boundary - distinct blue color
  {
    id: "gl-draw-polygon-fill-boundary",
    type: "fill",
    filter: ["all",
      ["==", "$type", "Polygon"],
      ["==", "user_zone_type", "farm_boundary"],
      ["!=", "mode", "static"]
    ],
    paint: {
      "fill-color": "#2563eb",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-stroke-boundary",
    type: "line",
    filter: ["all",
      ["==", "$type", "Polygon"],
      ["==", "user_zone_type", "farm_boundary"],
      ["!=", "mode", "static"]
    ],
    paint: {
      "line-color": "#2563eb",
      "line-width": 3,
      "line-dasharray": [2, 2]
    },
  },
  // Regular polygon fill
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all",
      ["==", "$type", "Polygon"],
      ["!=", "user_zone_type", "farm_boundary"],
      ["!=", "mode", "static"]
    ],
    paint: {
      "fill-color": "#16a34a",
      "fill-opacity": 0.3,
    },
  },
  // ... rest of styles
],
```

**Step 3: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat: style farm boundary distinctly in editor"
```

---

## Task 9: Update Database Schema Documentation

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Update Zone interface comments**

```typescript
export interface Zone {
  id: string;
  farm_id: string;
  name: string | null;
  zone_type: string; // 'farm_boundary' | 'zone' | 'feature'
  geometry: string; // GeoJSON
  properties: string | null; // JSON - for farm_boundary: { name, area_acres, area_hectares }
  created_at: number;
  updated_at: number;
}
```

**Step 2: Commit**

```bash
git add lib/db/schema.ts
git commit -m "docs: update zone schema with farm_boundary type"
```

---

## Task 10: Add Grid to BoundaryDrawer

**Files:**
- Modify: `components/map/boundary-drawer.tsx`

**Step 1: Import grid utilities**

```typescript
import { generateGridLines } from '@/lib/map/measurement-grid';
import type { FeatureCollection } from 'geojson';
```

**Step 2: Add grid state and update function**

After useState declarations:

```typescript
const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>('imperial');

const updateGrid = () => {
  if (!map.current) return;

  const bounds = map.current.getBounds();
  const zoom = map.current.getZoom();

  const { lines, labels } = generateGridLines(
    {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    },
    zoom,
    gridUnit
  );

  const gridLineSource = map.current.getSource('grid-lines') as maplibregl.GeoJSONSource;
  const gridLabelSource = map.current.getSource('grid-labels') as maplibregl.GeoJSONSource;

  if (gridLineSource) {
    gridLineSource.setData({
      type: 'FeatureCollection',
      features: lines
    });
  }

  if (gridLabelSource) {
    gridLabelSource.setData({
      type: 'FeatureCollection',
      features: labels
    });
  }
};
```

**Step 3: Add grid layers in map load event**

After map initialization:

```typescript
map.current.on('load', () => {
  if (!map.current) return;

  // Add grid layers
  map.current.addSource('grid-lines', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  map.current.addLayer({
    id: 'grid-lines-layer',
    type: 'line',
    source: 'grid-lines',
    paint: {
      'line-color': '#ffffff',
      'line-width': 1,
      'line-opacity': 0.2
    }
  });

  map.current.addSource('grid-labels', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  map.current.addLayer({
    id: 'grid-labels-layer',
    type: 'symbol',
    source: 'grid-labels',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 10,
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular']
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1
    }
  });

  updateGrid();
});

map.current.on('moveend', updateGrid);
map.current.on('zoomend', updateGrid);
```

**Step 4: Add grid unit toggle to JSX**

```tsx
{/* Grid unit toggle */}
<div className="absolute top-4 right-4 z-10">
  <button
    onClick={() => setGridUnit(gridUnit === 'imperial' ? 'metric' : 'imperial')}
    className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded shadow text-sm font-medium"
  >
    {gridUnit === 'imperial' ? 'Feet' : 'Meters'} ⟷
  </button>
</div>
```

**Step 5: Commit**

```bash
git add components/map/boundary-drawer.tsx
git commit -m "feat: add measurement grid to boundary drawer"
```

---

## Task 11: Final Testing and Verification

**Files:**
- None (testing only)

**Step 1: Test complete farm creation flow**

1. Start fresh - clear database if needed
2. Navigate to `/farm/new`
3. Enter farm details
4. Draw boundary
5. Verify area calculates
6. Verify grid shows and scales
7. Toggle grid units
8. Create farm
9. Verify boundary loads in editor
10. Verify grid shows in editor
11. Verify compass shows
12. Test all map layers

**Step 2: Test edge cases**

1. Very small boundary (< 0.1 acres) - should work
2. Very large boundary (100+ acres) - should work
3. Complex polygon (20+ points) - should work
4. Drawing on different map layers
5. Rapid zoom in/out (grid performance)

**Step 3: Test AI context**

1. Draw boundary
2. Add some zones
3. Ask AI a spatial question
4. Verify AI can see grid in screenshot
5. Verify AI can see compass
6. Verify AI references distances/directions

**Step 4: Document any issues**

Create GitHub issues for any bugs found.

**Step 5: Final commit**

```bash
git add .
git commit -m "test: verify farm boundaries, grid, and compass features"
```

---

## Success Criteria

✅ Farm creation requires boundary drawing
✅ Boundary area calculates correctly in acres/hectares
✅ Boundary stored as special `farm_boundary` zone
✅ Farm center/zoom auto-calculated from boundary
✅ Measurement grid shows on all maps
✅ Grid scales appropriately with zoom
✅ Grid toggles between imperial/metric
✅ Compass rose visible on all maps
✅ All features work across map layer changes
✅ AI receives spatial context in screenshots
✅ No performance issues with grid updates

---

## Rollback Plan

If critical issues found:

1. Revert commits: `git revert HEAD~11..HEAD`
2. Or restore from backup: `git reset --hard <commit-before-feature>`
3. Database: Run `npm run tsx scripts/clear-farms.ts` to clear test data
4. Redeploy previous version

---

## Future Enhancements

- Boundary editing after creation
- Import boundary from KML/GeoJSON
- Distance measurement tool
- Area calculation for arbitrary polygons
- Grid customization (custom intervals)
- Multiple boundaries for non-contiguous properties
