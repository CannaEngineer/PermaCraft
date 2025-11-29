"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Farm, Zone } from "@/lib/db/schema";

interface FarmMapProps {
  farm: Farm;
  zones: Zone[];
  onZonesChange: (zones: any[]) => void;
  onMapReady?: (map: maplibregl.Map) => void;
}

export function FarmMap({ farm, zones, onZonesChange, onMapReady }: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");

  // Use refs for callback to avoid re-initializing map
  const onZonesChangeRef = useRef(onZonesChange);
  useEffect(() => {
    onZonesChangeRef.current = onZonesChange;
  }, [onZonesChange]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [farm.center_lng, farm.center_lat],
      zoom: farm.zoom_level,
    });

    // Initialize drawing controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
    });

    map.current.addControl(draw.current as any, "top-right");

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Load existing zones with error handling
    zones.forEach((zone) => {
      try {
        const geometry = JSON.parse(zone.geometry);
        const properties = JSON.parse(zone.properties || "{}");
        draw.current!.add({
          id: zone.id,
          type: "Feature",
          geometry: geometry,
          properties: properties,
        });
      } catch (error) {
        console.error("Failed to parse zone data:", error, zone);
      }
    });

    // Listen for drawing changes
    const handleCreate = (e: any) => {
      onZonesChangeRef.current(draw.current!.getAll().features);
    };

    const handleUpdate = (e: any) => {
      onZonesChangeRef.current(draw.current!.getAll().features);
    };

    const handleDelete = (e: any) => {
      onZonesChangeRef.current(draw.current!.getAll().features);
    };

    map.current.on("draw.create", handleCreate);
    map.current.on("draw.update", handleUpdate);
    map.current.on("draw.delete", handleDelete);

    // Call onMapReady callback when map is fully initialized
    if (onMapReady) {
      map.current.on("load", () => {
        if (map.current) {
          onMapReady(map.current);
        }
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [farm.center_lng, farm.center_lat, farm.zoom_level, zones]);

  const toggleMapStyle = () => {
    if (!map.current) return;

    const newStyle = mapStyle === "street" ? "satellite" : "street";
    const styleUrl =
      newStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://tiles.openfreemap.org/styles/liberty";

    if (newStyle === "satellite") {
      map.current.setStyle({
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [styleUrl],
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
      });
    } else {
      map.current.setStyle(styleUrl);
    }

    setMapStyle(newStyle);

    // Re-add draw control after style change
    map.current.once("style.load", () => {
      if (draw.current && map.current) {
        const features = draw.current.getAll().features;
        draw.current.deleteAll();
        features.forEach((feature) => {
          draw.current!.add(feature);
        });
      }
    });
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      <button
        onClick={toggleMapStyle}
        className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        {mapStyle === "street" ? "Satellite" : "Street"} View
      </button>
    </div>
  );
}
