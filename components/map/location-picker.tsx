"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, zoom: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function LocationPicker({
  onLocationSelect,
  initialCenter = [-95.7129, 37.0902], // Center of USA
  initialZoom = 4,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.on("click", (e) => {
      const { lat, lng } = e.lngLat;

      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new maplibregl.Marker({ color: "#16a34a" })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }

      setCoordinates({ lat, lng });
      const zoom = map.current!.getZoom();
      onLocationSelect(lat, lng, zoom);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg border"
      />
      {coordinates && (
        <p className="text-sm text-muted-foreground">
          Selected: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
