"use client";

import { useEffect, useRef, useState, memo } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area } from "@turf/area";
import type { Feature, Polygon } from "geojson";
import { generateGridLines } from '@/lib/map/measurement-grid';
import type { FeatureCollection } from 'geojson';

interface BoundaryDrawerProps {
  onBoundaryComplete: (boundary: Feature<Polygon>, areaAcres: number) => void;
}

function BoundaryDrawerComponent({ onBoundaryComplete }: BoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [areaAcres, setAreaAcres] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>('imperial');
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const handleSearchClick = async () => {
    if (!searchQuery.trim() || !map.current) return;

    setSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'User-Agent': 'PermaCraft Farm Planner'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Search service unavailable');
      }

      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon } = results[0];

        // Fly to the location
        map.current.flyTo({
          center: [parseFloat(lon), parseFloat(lat)],
          zoom: 15,
          duration: 2000
        });

        setSearchError(null);
      } else {
        setSearchError('Location not found. Try a different search term.');
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSearchClick();
    }
  };

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

    // Add grid layers on map load
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

    // Update grid on zoom/move end
    map.current.on('moveend', updateGrid);
    map.current.on('zoomend', updateGrid);

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
      if (map.current) {
        map.current.off('moveend', updateGrid);
        map.current.off('zoomend', updateGrid);
      }
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

      {/* Search box */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for your location..."
              className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded shadow text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={searching}
            />
            <button
              type="button"
              onClick={handleSearchClick}
              disabled={searching || !searchQuery.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded shadow text-sm font-medium transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          {searchError && (
            <div className="bg-red-100 text-red-700 text-xs px-3 py-2 rounded shadow">
              {searchError}
            </div>
          )}
        </div>
      </div>

      {/* Grid unit toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setGridUnit(gridUnit === 'imperial' ? 'metric' : 'imperial')}
          className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded shadow text-sm font-medium"
        >
          {gridUnit === 'imperial' ? 'Feet' : 'Meters'} ⟷
        </button>
      </div>

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

export const BoundaryDrawer = memo(BoundaryDrawerComponent);
