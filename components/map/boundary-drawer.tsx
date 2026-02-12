"use client";

import { useEffect, useRef, useState, memo } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area } from "@turf/area";
import type { Feature, Polygon } from "geojson";
import { generateGridLines } from '@/lib/map/measurement-grid';
import { HelpCircle, X, Search, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoundaryDrawerProps {
  onBoundaryComplete: (boundary: Feature<Polygon>, areaAcres: number) => void;
}

function BoundaryDrawerComponent({ onBoundaryComplete }: BoundaryDrawerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const searchMarker = useRef<maplibregl.Marker | null>(null);
  const [areaAcres, setAreaAcres] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>('imperial');
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
      gridUnit,
      zoom,
      'auto'
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
            'User-Agent': 'Permaculture.Studio Farm Planner'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Search service unavailable');
      }

      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        const lngLat: [number, number] = [parseFloat(lon), parseFloat(lat)];

        // Remove existing marker if any
        if (searchMarker.current) {
          searchMarker.current.remove();
        }

        // Add a marker at the search location
        searchMarker.current = new maplibregl.Marker({
          color: '#16a34a', // Green color to match theme
          scale: 1.2,
        })
          .setLngLat(lngLat)
          .addTo(map.current);

        // Fly to the location
        map.current.flyTo({
          center: lngLat,
          zoom: 15,
          duration: 2000
        });

        setSearchError(null);
        setShowSearch(false);
        setSearchQuery("");
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
      center: [-98.5795, 39.8283],
      zoom: 4,
      maxZoom: 18,
      minZoom: 1,
    });

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

    map.current.on('load', () => {
      if (!map.current) return;

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

    const handleCreate = (e: any) => {
      const features = draw.current!.getAll().features;
      if (features.length > 0) {
        const feature = features[0] as Feature<Polygon>;

        const areaSquareMeters = area(feature);
        const acres = areaSquareMeters / 4046.86;

        // Remove search marker when boundary is created
        if (searchMarker.current) {
          searchMarker.current.remove();
          searchMarker.current = null;
        }

        setAreaAcres(acres);
        setIsComplete(true);

        if (acres < 0.25 && map.current) {
          const coords = feature.geometry.coordinates[0];
          const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

          map.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 18,
            duration: 1500
          });
        }
        onBoundaryComplete(feature, acres);

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
      if (searchMarker.current) {
        searchMarker.current.remove();
        searchMarker.current = null;
      }
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
      <div ref={mapContainer} className="h-[400px] md:h-[500px] w-full overflow-hidden" />

      {/* Grid unit toggle - top right, minimal */}
      <button
        type="button"
        onClick={() => setGridUnit(gridUnit === 'imperial' ? 'metric' : 'imperial')}
        className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-background/95 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-lg text-xs md:text-sm font-medium hover:bg-background transition-colors border border-border"
      >
        {gridUnit === 'imperial' ? 'ft' : 'm'}
      </button>

      {/* Mobile-optimized bottom controls - Thumb Zone */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2">
        {/* Search toggle button */}
        {!showSearch && !isComplete && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="md:hidden self-start bg-background/95 backdrop-blur-xl rounded-full px-4 py-3 shadow-lg font-medium text-sm flex items-center gap-2 border border-border hover:bg-background transition-all active:scale-95"
          >
            <MapPin className="w-4 h-4" />
            Find Location
          </button>
        )}

        {/* Search box - bottom for thumb access on mobile */}
        {showSearch && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border border-border animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search for your property..."
                className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-muted-foreground"
                disabled={searching}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSearchClick}
                disabled={searching || !searchQuery.trim()}
                className="flex-1 h-10 rounded-xl font-semibold"
                size="sm"
              >
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
            {searchError && (
              <div className="mt-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {searchError}
              </div>
            )}
          </div>
        )}

        {/* Desktop search - top center */}
        <div className="hidden md:block absolute top-4 left-1/2 -translate-x-1/2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for your location..."
              className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              disabled={searching}
            />
            <button
              type="button"
              onClick={handleSearchClick}
              disabled={searching || !searchQuery.trim()}
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          {searchError && (
            <div className="mt-2 bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-lg shadow">
              {searchError}
            </div>
          )}
        </div>

        {/* Area display - prominent when complete */}
        {areaAcres !== null && (
          <div className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border-2 border-primary/20 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-muted-foreground">Boundary Area</p>
                <p className="text-xl font-bold text-green-600">
                  {areaAcres.toFixed(2)} acres
                </p>
                <p className="text-xs text-muted-foreground">
                  {(areaAcres * 0.404686).toFixed(2)} hectares
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help button - collapsed by default */}
        {!isComplete && (
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="self-start bg-background/95 backdrop-blur-xl rounded-full px-4 py-3 shadow-lg font-medium text-sm flex items-center gap-2 border border-border hover:bg-background transition-all active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            {showInstructions ? "Hide Help" : "How to Draw"}
          </button>
        )}

        {/* Instructions - bottom sheet style */}
        {showInstructions && (
          <div className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-border animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">Draw Your Boundary</h3>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">1</span>
                <span className="pt-0.5">Find your property using search or pan/zoom</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">2</span>
                <span className="pt-0.5">Tap the polygon tool in the top-right corner</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">3</span>
                <span className="pt-0.5">Tap points around your property boundary</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">4</span>
                <span className="pt-0.5">Double-tap the last point to finish drawing</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export const BoundaryDrawer = memo(BoundaryDrawerComponent);
