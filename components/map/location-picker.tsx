"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Use ref for callback to avoid hydration issues
  const onLocationSelectRef = useRef(onLocationSelect);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
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
        center: initialCenter,
        zoom: initialZoom,
        maxZoom: 20,
        minZoom: 1,
      });

      // Handle WebGL context loss
      map.current.on("webglcontextlost", (e: any) => {
        console.warn("WebGL context lost, preventing default behavior");
        if (e.preventDefault) {
          e.preventDefault();
        }
      });

      map.current.on("webglcontextrestored", () => {
        console.log("WebGL context restored");
      });

      map.current.on("error", (e) => {
        console.error("Map error:", e);
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
        onLocationSelectRef.current(lat, lng, zoom);
      });
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }

    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !map.current) return;

    setSearchLoading(true);
    setSearchError("");

    try {
      // Use Nominatim geocoding API (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            "User-Agent": "PermaCraft Farm Planner",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();

      if (data.length === 0) {
        setSearchError("Address not found. Please try a different search.");
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Fly to location
      map.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 2000,
      });

      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new maplibregl.Marker({ color: "#16a34a" })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      setCoordinates({ lat, lng });
      onLocationSelectRef.current(lat, lng, 16);
    } catch (error) {
      console.error("Geocoding error:", error);
      setSearchError("Failed to search address. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter address or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          disabled={searchLoading}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={searchLoading || !searchQuery.trim()}
        >
          {searchLoading ? (
            "Searching..."
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {searchError && (
        <div className="text-sm text-destructive">
          {searchError}
        </div>
      )}

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
