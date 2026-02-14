'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Move } from 'lucide-react';

interface ImageryAlignmentToolProps {
  farmId: string;
  imageryId: string;
  imageUrl: string;
  center: [number, number];
  onAlignmentComplete: (corners: [[number, number], [number, number], [number, number], [number, number]]) => void;
}

export function ImageryAlignmentTool({
  farmId,
  imageryId,
  imageUrl,
  center,
  onAlignmentComplete
}: ImageryAlignmentToolProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [corners, setCorners] = useState<[[number, number], [number, number], [number, number], [number, number]] | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: center,
      zoom: 16,
    });

    // Add satellite layer
    map.current.on('load', () => {
      map.current!.addSource('satellite', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      });

      map.current!.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite'
      });

      // Initialize 4 corner markers
      const initialCorners: [[number, number], [number, number], [number, number], [number, number]] = [
        [center[0] - 0.001, center[1] + 0.001], // NW
        [center[0] + 0.001, center[1] + 0.001], // NE
        [center[0] + 0.001, center[1] - 0.001], // SE
        [center[0] - 0.001, center[1] - 0.001]  // SW
      ];

      setCorners(initialCorners);

      initialCorners.forEach((corner, idx) => {
        const marker = new maplibregl.Marker({ draggable: true })
          .setLngLat(corner)
          .addTo(map.current!);

        marker.on('dragend', () => {
          updateCorners();
        });

        markers.current.push(marker);
      });
    });

    return () => map.current?.remove();
  }, []);

  function updateCorners() {
    const newCorners: [[number, number], [number, number], [number, number], [number, number]] = [
      markers.current[0].getLngLat().toArray() as [number, number],
      markers.current[1].getLngLat().toArray() as [number, number],
      markers.current[2].getLngLat().toArray() as [number, number],
      markers.current[3].getLngLat().toArray() as [number, number]
    ];
    setCorners(newCorners);
  }

  function handleSave() {
    if (corners) {
      onAlignmentComplete(corners);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Move className="h-5 w-5" />
          Align Imagery
        </CardTitle>
        <CardDescription>
          Drag the corner markers to align your imagery with the satellite basemap
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={mapContainer} className="w-full h-96 rounded-md overflow-hidden" />
        <Button onClick={handleSave} className="w-full">
          Save Alignment
        </Button>
      </CardContent>
    </Card>
  );
}
