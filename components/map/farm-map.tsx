"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Farm, Zone } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Layers, Tag, HelpCircle } from "lucide-react";
import { CompassRose } from "./compass-rose";
import { generateGridLines, type GridUnit } from '@/lib/map/measurement-grid';
import type { FeatureCollection, LineString, Point } from 'geojson';

interface FarmMapProps {
  farm: Farm;
  zones: Zone[];
  onZonesChange: (zones: any[]) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  onMapLayerChange?: (layer: string) => void;
}

type MapLayer = "satellite" | "street" | "terrain" | "topo";

export function FarmMap({ farm, zones, onZonesChange, onMapReady, onMapLayerChange }: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>("satellite");
  const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>('imperial');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneLabel, setZoneLabel] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Use refs for callback to avoid re-initializing map
  const onZonesChangeRef = useRef(onZonesChange);
  useEffect(() => {
    onZonesChangeRef.current = onZonesChange;
  }, [onZonesChange]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
      // Initialize map with satellite view
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
        center: [farm.center_lng, farm.center_lat],
        zoom: farm.zoom_level,
        // Remove preserveDrawingBuffer - not needed with html-to-image and reduces GPU memory
        maxZoom: 20,
        minZoom: 1,
      });

      // Handle WebGL context loss with automatic restoration
      map.current.on("webglcontextlost", (e: any) => {
        console.warn("WebGL context lost, attempting to restore...");
        e.preventDefault(); // Prevent context from being permanently lost
      });

      map.current.on("webglcontextrestored", () => {
        console.log("WebGL context restored successfully");
        // Trigger map redraw
        if (map.current) {
          map.current.resize();
          map.current.triggerRepaint();
        }
      });

      map.current.on("error", (e: any) => {
        console.error("Map error:", e);
        // If it's a context loss error, attempt recovery
        if (e.error?.message?.includes("context")) {
          console.warn("Attempting to recover from context error...");
          setTimeout(() => {
            if (map.current) {
              map.current.resize();
            }
          }, 100);
        }
      });

    // Initialize drawing controls with all tools
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
      styles: [
        // Polygon fill
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "fill-color": "#16a34a",
            "fill-opacity": 0.3,
          },
        },
        // Polygon outline
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "line-color": "#16a34a",
            "line-width": 3,
          },
        },
        // Line strings
        {
          id: "gl-draw-line",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
          paint: {
            "line-color": "#2563eb",
            "line-width": 3,
          },
        },
        // Points
        {
          id: "gl-draw-point",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["!=", "mode", "static"]],
          paint: {
            "circle-radius": 6,
            "circle-color": "#dc2626",
          },
        },
        // Vertex points
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

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

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

    // Update grid on zoom/move end
    map.current.on('moveend', updateGrid);
    map.current.on('zoomend', updateGrid);

    // Listen for drawing changes
    const handleCreate = (e: any) => {
      const features = draw.current!.getAll().features;
      console.log("Zone created:", features);
      onZonesChangeRef.current(features);
    };

    const handleUpdate = (e: any) => {
      const features = draw.current!.getAll().features;
      console.log("Zone updated:", features);
      onZonesChangeRef.current(features);
    };

    const handleDelete = (e: any) => {
      const features = draw.current!.getAll().features;
      console.log("Zone deleted:", features);
      onZonesChangeRef.current(features);
    };

    map.current.on("draw.create", handleCreate);
    map.current.on("draw.update", handleUpdate);
    map.current.on("draw.delete", handleDelete);

    // Handle zone selection for labeling
    map.current.on("draw.selectionchange", (e: any) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        setSelectedZone(feature.id);
        setZoneLabel(feature.properties?.name || "");
      } else {
        setSelectedZone(null);
        setZoneLabel("");
      }
    });

    // Update container class based on drawing mode
    map.current.on("draw.modechange", (e: any) => {
      const container = mapContainer.current;
      if (!container) return;

      // Remove all mode classes
      container.classList.remove("mode-draw_point", "mode-draw_line_string", "mode-draw_polygon", "mode-simple_select");

      // Add the current mode class
      if (e.mode) {
        container.classList.add(`mode-${e.mode}`);
      }
    });

    // Call onMapReady callback when map is fully initialized
    if (onMapReady) {
      map.current.on("load", () => {
        if (map.current) {
          onMapReady(map.current);
        }
      });
    }

    } catch (error) {
      console.error("Failed to initialize map:", error);
    }

    return () => {
      if (draw.current) {
        draw.current = null;
      }
      if (map.current) {
        map.current.off('moveend', updateGrid);
        map.current.off('zoomend', updateGrid);
        map.current.remove();
        map.current = null;
      }
    };
  }, [farm.center_lng, farm.center_lat, farm.zoom_level, onMapReady]);

  // Separate effect to load initial zones only once
  useEffect(() => {
    console.log("Zones effect triggered, zones:", zones);
    if (!draw.current || zones.length === 0) {
      console.log("Skipping zone load: draw not ready or no zones");
      return;
    }

    // Only load zones if draw control is empty
    const currentFeatures = draw.current.getAll().features;
    console.log("Current features in draw control:", currentFeatures);
    if (currentFeatures.length > 0) {
      console.log("Skipping zone load: features already exist");
      return;
    }

    // Load initial zones
    console.log("Loading zones into draw control");
    zones.forEach((zone) => {
      try {
        // Handle both database zones (geometry is string) and draw zones (geometry is object)
        const geometry = typeof zone.geometry === "string"
          ? JSON.parse(zone.geometry)
          : zone.geometry;
        const properties = typeof zone.properties === "string"
          ? JSON.parse(zone.properties || "{}")
          : (zone.properties || {});

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
  }, [zones]);

  // Update grid when unit changes
  useEffect(() => {
    updateGrid();
  }, [gridUnit]);

  const changeMapLayer = (layer: MapLayer) => {
    if (!map.current) return;

    let style: any;

    switch (layer) {
      case "satellite":
        style = {
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
        };
        break;
      case "terrain":
        style = {
          version: 8,
          sources: {
            terrain: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: "terrain",
              type: "raster",
              source: "terrain",
            },
          ],
        };
        break;
      case "topo":
        style = {
          version: 8,
          sources: {
            topo: {
              type: "raster",
              tiles: [
                "https://tile.opentopomap.org/{z}/{x}/{y}.png"
              ],
              tileSize: 256,
              maxzoom: 17,
            },
          },
          layers: [
            {
              id: "topo",
              type: "raster",
              source: "topo",
            },
          ],
        };
        break;
      case "street":
      default:
        style = "https://tiles.openfreemap.org/styles/liberty";
        break;
    }

    map.current.setStyle(style);
    setMapLayer(layer);
    setShowLayerMenu(false);

    // Notify parent of map layer change
    if (onMapLayerChange) {
      onMapLayerChange(layer);
    }

    // Re-add draw control after style change
    map.current.once("style.load", () => {
      if (draw.current && map.current) {
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
  };

  const handleLabelZone = () => {
    if (!selectedZone || !draw.current || !zoneLabel.trim()) return;

    const feature = draw.current.get(selectedZone);
    if (feature) {
      feature.properties = { ...feature.properties, name: zoneLabel };
      draw.current.add(feature);
      onZonesChangeRef.current(draw.current.getAll().features);
    }
  };

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

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Layer Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => {
            setShowLayerMenu(!showLayerMenu);
            setShowHelp(false);
          }}
          variant="secondary"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Layers className="h-4 w-4 mr-2" />
          {mapLayer === "satellite" && "Satellite"}
          {mapLayer === "street" && "Street"}
          {mapLayer === "terrain" && "Terrain"}
          {mapLayer === "topo" && "Topographic"}
        </Button>

        {showLayerMenu && (
          <div className="absolute top-full mt-2 bg-white rounded shadow-lg p-2 space-y-1 min-w-[140px] z-50">
            <button
              onClick={() => changeMapLayer("satellite")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                mapLayer === "satellite" ? "bg-gray-100 font-medium" : ""
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => changeMapLayer("terrain")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                mapLayer === "terrain" ? "bg-gray-100 font-medium" : ""
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => changeMapLayer("topo")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                mapLayer === "topo" ? "bg-gray-100 font-medium" : ""
              }`}
            >
              Topographic
            </button>
            <button
              onClick={() => changeMapLayer("street")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                mapLayer === "street" ? "bg-gray-100 font-medium" : ""
              }`}
            >
              Street
            </button>
          </div>
        )}
      </div>

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

      {/* Drawing Tools Help - positioned at bottom right */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          onClick={() => {
            setShowHelp(!showHelp);
            setShowLayerMenu(false);
          }}
          variant="secondary"
          size="sm"
          className="bg-white shadow-lg"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>

        {showHelp && (
          <div className="absolute bottom-full mb-2 right-0 bg-white rounded shadow-lg p-4 w-80 z-50">
            <h3 className="font-semibold mb-3">Drawing Tools (Top-Right Corner)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">📍</div>
                <div>
                  <div className="font-medium">Point Tool (Top button)</div>
                  <div className="text-gray-600 text-xs">Click the map to mark locations</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">📏</div>
                <div>
                  <div className="font-medium">Line Tool (2nd button)</div>
                  <div className="text-gray-600 text-xs">Click points to draw a path. Double-click to finish.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">⬡</div>
                <div>
                  <div className="font-medium">Polygon Tool (3rd button)</div>
                  <div className="text-gray-600 text-xs">Click points to draw an area. Double-click to close.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">🗑️</div>
                <div>
                  <div className="font-medium">Delete Tool (Bottom button)</div>
                  <div className="text-gray-600 text-xs">Click it, then click a feature to delete</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-gray-600">
              <strong>How to use:</strong> Click a tool button in the top-right corner, then click on the map to draw. Your cursor will change to indicate the active tool.
            </div>
          </div>
        )}
      </div>

      {/* Zone Labeling Panel */}
      {selectedZone && (
        <div className="absolute bottom-4 left-4 bg-white rounded shadow-lg p-4 z-10 w-80">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4" />
            <h3 className="font-medium">Label Zone</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={zoneLabel}
              onChange={(e) => setZoneLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLabelZone();
                }
              }}
              placeholder="e.g., Vegetable Garden, Orchard..."
              className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button
              onClick={handleLabelZone}
              size="sm"
              disabled={!zoneLabel.trim()}
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click a zone to select it, then add a label
          </p>
        </div>
      )}

      {/* Compass Rose */}
      <CompassRose />
    </div>
  );
}
