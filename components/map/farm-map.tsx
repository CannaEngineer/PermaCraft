"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Farm, Zone } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Layers, Tag, HelpCircle, Circle } from "lucide-react";
import { createCirclePolygon } from "@/lib/map/circle-helper";
import { CompassRose } from "./compass-rose";
import { MapLegend } from "./map-legend";
import { generateGridLines, generateViewportLabels, type GridUnit } from "@/lib/map/measurement-grid";
import { ZONE_TYPES, USER_SELECTABLE_ZONE_TYPES, getZoneTypeConfig } from "@/lib/map/zone-types";
import type { FeatureCollection, LineString, Point } from "geojson";

// Create color expressions for dynamic zone type styling
const createFillColorExpression = () => {
  const expression: any = ["case"];
  Object.entries(ZONE_TYPES).forEach(([type, config]) => {
    expression.push(["==", ["get", "user_zone_type"], type]);
    expression.push(config.fillColor);
  });
  expression.push("#64748b"); // default color (gray for "other")
  return expression;
};

const createStrokeColorExpression = () => {
  const expression: any = ["case"];
  Object.entries(ZONE_TYPES).forEach(([type, config]) => {
    expression.push(["==", ["get", "user_zone_type"], type]);
    expression.push(config.strokeColor);
  });
  expression.push("#475569"); // default color (gray for "other")
  return expression;
};

const createFillOpacityExpression = () => {
  const expression: any = ["case"];
  Object.entries(ZONE_TYPES).forEach(([type, config]) => {
    expression.push(["==", ["get", "user_zone_type"], type]);
    expression.push(config.fillOpacity);
  });
  expression.push(0); // default opacity (transparent for backwards compatibility)
  return expression;
};

interface FarmMapProps {
  farm: Farm;
  zones: Zone[];
  onZonesChange: (zones: any[]) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  onMapLayerChange?: (layer: string) => void;
}

type MapLayer = "satellite" | "street" | "terrain" | "topo";

export function FarmMap({
  farm,
  zones,
  onZonesChange,
  onMapReady,
  onMapLayerChange,
}: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>("satellite");
  const [gridUnit, setGridUnit] = useState<"imperial" | "metric">("imperial");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneLabel, setZoneLabel] = useState("");
  const [zoneType, setZoneType] = useState<string>("other");
  const [showHelp, setShowHelp] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [circleMode, setCircleMode] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const circleCenterMarker = useRef<maplibregl.Marker | null>(null);

  // Helper function to ensure custom layers are always on top
  const ensureCustomLayersOnTop = useCallback(() => {
    if (!map.current) return;

    const customLayers = [
      'farm-boundary-outline',
      'farm-boundary-stroke',
      'colored-zones-fill',
      'colored-zones-stroke',
      'colored-lines',
      'colored-points',
      'grid-lines-layer',
      'grid-labels-layer',
    ];

    console.log("Moving custom layers to top...");
    const existingLayers: string[] = [];
    const missingLayers: string[] = [];

    // Move each layer to the top in order
    customLayers.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.moveLayer(layerId);
        existingLayers.push(layerId);
      } else {
        missingLayers.push(layerId);
      }
    });

    console.log("Layers moved to top:", existingLayers);
    if (missingLayers.length > 0) {
      console.warn("Missing layers (not yet added):", missingLayers);
    }
  }, []);

  // Manage circle center marker
  useEffect(() => {
    if (!map.current) return;

    // Remove existing marker
    if (circleCenterMarker.current) {
      circleCenterMarker.current.remove();
      circleCenterMarker.current = null;
    }

    // Add marker if center is set
    if (circleCenter && circleMode) {
      circleCenterMarker.current = new maplibregl.Marker({
        color: "#ef4444",
        draggable: false,
      })
        .setLngLat(circleCenter)
        .addTo(map.current);
    }

    return () => {
      if (circleCenterMarker.current) {
        circleCenterMarker.current.remove();
        circleCenterMarker.current = null;
      }
    };
  }, [circleCenter, circleMode]);

  // Setup grid layers - needs to be called after map style changes
  const setupGridLayers = useCallback(() => {
    if (!map.current) return;

    console.log("setupGridLayers called");

    // Add grid sources and layers (always re-add after style changes)
    if (!map.current.getSource("grid-lines")) {
      console.log("Adding grid-lines source");
      map.current.addSource("grid-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    } else {
      console.log("grid-lines source already exists");
    }

    if (!map.current.getLayer("grid-lines-layer")) {
      console.log("Adding grid-lines-layer");
      map.current.addLayer({
        id: "grid-lines-layer",
        type: "line",
        source: "grid-lines",
        paint: {
          "line-color": "#ffff00",
          "line-width": 1,
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 0.15,
            13, 0.25,
            15, 0.4,
            17, 0.5,
            20, 0.6
          ],
        },
      });
    }

    if (!map.current.getSource("grid-labels")) {
      console.log("Adding grid-labels source");
      map.current.addSource("grid-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    } else {
      console.log("grid-labels source already exists");
    }

    if (!map.current.getLayer("grid-labels-layer")) {
      console.log("Adding grid-labels-layer");
      map.current.addLayer({
        id: "grid-labels-layer",
        type: "symbol",
        source: "grid-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 7,
            14, 9,
            16, 11,
            18, 13,
            20, 15
          ],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-allow-overlap": true,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#ffff00",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
          "text-halo-blur": 1,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 0.6,
            13, 0.7,
            15, 0.85,
            17, 1.0
          ],
        },
      });
    } else {
      console.log("grid-labels-layer already exists");
    }

    console.log("setupGridLayers completed");
  }, []);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    try {
      // Initialize map with satellite view
      map.current = new maplibregl.Map({
        container: mapContainer.current!,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: 'Tiles &copy; Esri',
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
        maxZoom: 20,
        minZoom: 1,
        // @ts-ignore - preserveDrawingBuffer is valid but missing from type definitions
        preserveDrawingBuffer: true, // Required for screenshots
      });

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
          // Farm boundary - distinct purple color with white outline
          {
            id: "gl-draw-polygon-fill-boundary",
            type: "fill",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["==", "user_zone_type", "farm_boundary"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "fill-color": "#9333ea",
              "fill-opacity": 0,
            },
          },
          {
            id: "gl-draw-polygon-stroke-boundary-outline",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["==", "user_zone_type", "farm_boundary"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 5,
              "line-dasharray": [2, 2],
            },
          },
          {
            id: "gl-draw-polygon-stroke-boundary",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["==", "user_zone_type", "farm_boundary"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "line-color": "#9333ea",
              "line-width": 3,
              "line-dasharray": [2, 2],
            },
          },
          // Regular polygon fill - DISABLED (using custom layer instead)
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "user_zone_type", "farm_boundary"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "fill-color": "#ffffff",
              "fill-opacity": 0, // Transparent - custom layer handles colors
            },
          },
          // Regular polygon outline - white background (only during editing)
          {
            id: "gl-draw-polygon-stroke-outline",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "user_zone_type", "farm_boundary"],
              ["==", "mode", "direct_select"], // Only show during editing
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 5,
            },
          },
          // Regular polygon outline - DISABLED (using custom layer instead)
          {
            id: "gl-draw-polygon-stroke",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "user_zone_type", "farm_boundary"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 0, // Transparent - custom layer handles colors
            },
          },
          // Line strings - DISABLED (using custom layer instead)
          {
            id: "gl-draw-line-outline",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "LineString"],
              ["==", "mode", "direct_select"], // Only during editing
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 5,
            },
          },
          // Line strings - DISABLED (using custom layer instead)
          {
            id: "gl-draw-line",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "LineString"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 0, // Transparent - custom layer handles colors
            },
          },
          // Points - DISABLED (using custom layer instead)
          {
            id: "gl-draw-point-outline",
            type: "circle",
            filter: [
              "all",
              ["==", "$type", "Point"],
              ["==", "mode", "direct_select"], // Only during editing
            ],
            paint: {
              "circle-radius": 8,
              "circle-color": "#ffffff",
            },
          },
          // Points - DISABLED (using custom layer instead)
          {
            id: "gl-draw-point",
            type: "circle",
            filter: [
              "all",
              ["==", "$type", "Point"],
              ["!=", "mode", "static"],
            ],
            paint: {
              "circle-radius": 0, // Transparent - custom layer handles colors
              "circle-color": "#ffffff",
            },
          },
          // Vertex points - white outline
          {
            id: "gl-draw-polygon-and-line-vertex-outline",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["!=", "mode", "static"]],
            paint: {
              "circle-radius": 7,
              "circle-color": "#000000",
            },
          },
          // Vertex points - white with green stroke
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
      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      // Add custom circle button to the draw control panel
      setTimeout(() => {
        // Check if button already exists
        if (document.getElementById('draw-circle-btn')) return;

        const drawControlGroup = document.querySelector('.mapbox-gl-draw_ctrl-draw-btn');
        if (drawControlGroup?.parentElement) {
          const circleButton = document.createElement('button');
          circleButton.className = 'mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_circle';
          circleButton.id = 'draw-circle-btn';
          circleButton.setAttribute('title', 'Circle tool (c)');
          circleButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

          // Insert after polygon button (3rd button)
          const polygonBtn = drawControlGroup.parentElement.children[2];
          if (polygonBtn) {
            polygonBtn.after(circleButton);
          }

          circleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setCircleMode(prev => !prev);
            setCircleCenter(null);

            // Deactivate other draw tools
            document.querySelectorAll('.mapbox-gl-draw_ctrl-draw-btn').forEach(btn => {
              btn.classList.remove('active');
            });

            if (draw.current) {
              draw.current.changeMode('simple_select');
            }
          });
        }
      }, 100);

      // Add custom layers for colored zones after draw is initialized
      const addColoredZoneLayers = () => {
        if (!map.current || !draw.current) return;

        // Add a source that will use the draw data
        if (!map.current.getSource("draw-zones")) {
          map.current.addSource("draw-zones", {
            type: "geojson",
            data: draw.current.getAll(),
          });
        }

        // Add farm boundary layers FIRST (so they're under other zones but above base map)
        if (!map.current.getLayer("farm-boundary-outline")) {
          map.current.addLayer({
            id: "farm-boundary-outline",
            type: "line",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "Polygon"],
              ["==", ["get", "user_zone_type"], "farm_boundary"]
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 5,
              "line-dasharray": [2, 2],
            },
          });
        }

        if (!map.current.getLayer("farm-boundary-stroke")) {
          map.current.addLayer({
            id: "farm-boundary-stroke",
            type: "line",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "Polygon"],
              ["==", ["get", "user_zone_type"], "farm_boundary"]
            ],
            paint: {
              "line-color": "#9333ea",
              "line-width": 3,
              "line-dasharray": [2, 2],
            },
          });
        }

        // Add fill layer with dynamic colors (excluding farm boundary)
        if (!map.current.getLayer("colored-zones-fill")) {
          map.current.addLayer({
            id: "colored-zones-fill",
            type: "fill",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "Polygon"],
              ["!=", ["get", "user_zone_type"], "farm_boundary"]
            ],
            paint: {
              "fill-color": createFillColorExpression(),
              "fill-opacity": createFillOpacityExpression(),
            },
          });
        }

        // Add stroke layer with dynamic colors (excluding farm boundary)
        if (!map.current.getLayer("colored-zones-stroke")) {
          map.current.addLayer({
            id: "colored-zones-stroke",
            type: "line",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "Polygon"],
              ["!=", ["get", "user_zone_type"], "farm_boundary"]
            ],
            paint: {
              "line-color": createStrokeColorExpression(),
              "line-width": 3,
            },
          });
        }

        // Add line layer for LineString features
        if (!map.current.getLayer("colored-lines")) {
          map.current.addLayer({
            id: "colored-lines",
            type: "line",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "LineString"]
            ],
            paint: {
              "line-color": createStrokeColorExpression(),
              "line-width": 3,
            },
          });
        }

        // Add point layer for Point features
        if (!map.current.getLayer("colored-points")) {
          map.current.addLayer({
            id: "colored-points",
            type: "circle",
            source: "draw-zones",
            filter: ["all",
              ["==", ["geometry-type"], "Point"]
            ],
            paint: {
              "circle-color": createFillColorExpression(),
              "circle-radius": 6,
              "circle-stroke-color": createStrokeColorExpression(),
              "circle-stroke-width": 2,
            },
          });
        }

        // CRITICAL: Ensure layer ordering - move all custom layers to top
        // This ensures they render above ALL base map layers
        ensureCustomLayersOnTop();
      };

      // Update the colored zones when features change
      const updateColoredZones = () => {
        if (!map.current || !draw.current) return;
        const source = map.current.getSource("draw-zones") as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(draw.current.getAll());
        }
        // Ensure layers stay on top after data updates
        ensureCustomLayersOnTop();
      };

      map.current.on("load", () => {
        if (!map.current) return;
        setupGridLayers();
        updateGrid();

        // Add colored zone layers after a short delay to ensure draw is ready
        setTimeout(() => {
          addColoredZoneLayers();
        }, 100);

        // Load initial zones
        if (draw.current && zones.length > 0) {
          console.log("Loading zones from database:", zones);
          zones.forEach((zone) => {
            try {
              const geometry =
                typeof zone.geometry === "string"
                  ? JSON.parse(zone.geometry)
                  : zone.geometry;
              const properties =
                typeof zone.properties === "string"
                  ? JSON.parse(zone.properties || "{}")
                  : zone.properties || {};
              const feature = {
                id: zone.id,
                type: "Feature" as const,
                geometry: geometry,
                properties: { ...properties, user_zone_type: zone.zone_type },
              };
              console.log("Adding zone to map:", {
                id: zone.id,
                zoneType: zone.zone_type,
                properties: feature.properties
              });
              draw.current!.add(feature);
            } catch (error) {
              console.error("Failed to parse zone data:", error, zone);
            }
          });

          // Update colored zones after loading initial data
          setTimeout(() => {
            updateColoredZones();
          }, 200);
        }

        if (onMapReady) {
          onMapReady(map.current);
        }
      });

      // Store original farm boundary for restoration
      const farmBoundaryCache = new Map<string, any>();

      const handleDrawChange = (e: any) => {
        if (draw.current) {
          // Cache farm boundaries
          draw.current.getAll().features.forEach((feature: any) => {
            if (feature.properties?.user_zone_type === "farm_boundary" && !farmBoundaryCache.has(feature.id)) {
              farmBoundaryCache.set(feature.id, JSON.parse(JSON.stringify(feature)));
            }
          });

          onZonesChange(draw.current.getAll().features);
          // Update grid when zones change (especially farm_boundary)
          updateGrid();
          // Update colored zones
          updateColoredZones();
        }
      };

      const handleDrawUpdate = (e: any) => {
        if (e.features && e.features.length > 0 && draw.current) {
          // Check if any updated feature is a farm boundary
          const updatedFarmBoundaries = e.features.filter(
            (f: any) => f.properties?.user_zone_type === "farm_boundary"
          );

          if (updatedFarmBoundaries.length > 0) {
            // Restore original farm boundaries
            updatedFarmBoundaries.forEach((feature: any) => {
              const original = farmBoundaryCache.get(feature.id);
              if (original && draw.current) {
                draw.current.delete(feature.id);
                draw.current.add(original);
                console.warn("Farm boundary cannot be moved or edited - restored to original position");
              }
            });
          }
        }

        handleDrawChange(e);
      };

      // Prevent farm boundary from being deleted
      const handleDrawDelete = (e: any) => {
        if (e.features && e.features.length > 0) {
          // Check if any deleted feature was a farm boundary
          const deletedFarmBoundary = e.features.find(
            (f: any) => f.properties?.user_zone_type === "farm_boundary"
          );

          if (deletedFarmBoundary && draw.current) {
            // Immediately restore the farm boundary
            draw.current.add(deletedFarmBoundary);
            console.warn("Farm boundary cannot be deleted");
          }
        }

        handleDrawChange(e);
      };

      map.current.on("draw.create", handleDrawChange);
      map.current.on("draw.update", handleDrawUpdate);
      map.current.on("draw.delete", handleDrawDelete);

      // Update grid labels when viewport changes (for AI context)
      map.current.on("moveend", updateGrid);
      map.current.on("zoomend", updateGrid);

      // Update compass bearing when map rotates
      map.current.on("rotate", () => {
        if (map.current) {
          setBearing(map.current.getBearing());
        }
      });

      // Prevent farm boundary from being edited or moved
      map.current.on("draw.selectionchange", (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];

          // Prevent farm boundary from being selected (makes it immovable/uneditable)
          if (feature.properties?.user_zone_type === "farm_boundary") {
            if (draw.current) {
              draw.current.changeMode('simple_select');
            }
            setSelectedZone(null);
            setZoneLabel("");
            setZoneType("other");
            return;
          }

          setSelectedZone(feature.id);
          setZoneLabel(feature.properties?.name || "");
          setZoneType(feature.properties?.user_zone_type || "other");
          console.log("Zone selected:", {
            id: feature.id,
            name: feature.properties?.name,
            zoneType: feature.properties?.user_zone_type
          });
        } else {
          setSelectedZone(null);
          setZoneLabel("");
          setZoneType("other");
        }
      });

      // Prevent farm boundary from entering edit mode
      map.current.on("draw.modechange", (e: any) => {
        if (e.mode === "direct_select" && draw.current) {
          const selectedFeatures = draw.current.getSelected().features;
          if (selectedFeatures.length > 0) {
            const feature = selectedFeatures[0];
            if (feature.properties?.user_zone_type === "farm_boundary") {
              // Force back to simple_select if trying to edit farm boundary
              draw.current.changeMode('simple_select');
              console.warn("Farm boundary cannot be edited");
            }
          }
        }
      });
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    updateGrid();
  }, [gridUnit]);

  // Circle drawing click handler - separate useEffect to avoid stale closure
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!circleMode || !draw.current) return;

      if (!circleCenter) {
        // First click - set center
        setCircleCenter([e.lngLat.lng, e.lngLat.lat]);
      } else {
        // Second click - create circle
        const center = circleCenter;
        const edge: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        // Calculate radius in meters using Haversine formula
        const R = 6371000; // Earth's radius in meters
        const lat1 = (center[1] * Math.PI) / 180;
        const lat2 = (edge[1] * Math.PI) / 180;
        const deltaLat = ((edge[1] - center[1]) * Math.PI) / 180;
        const deltaLng = ((edge[0] - center[0]) * Math.PI) / 180;

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const radius = R * c;

        // Create circle polygon
        const circle = createCirclePolygon(center, radius);
        draw.current.add(circle);

        // Reset circle mode
        setCircleMode(false);
        setCircleCenter(null);

        // Update zones
        onZonesChange(draw.current.getAll().features);

        // Update the colored zones layer
        if (map.current) {
          const source = map.current.getSource("draw-zones") as maplibregl.GeoJSONSource;
          if (source && draw.current) {
            source.setData(draw.current.getAll());
          }
        }
      }
    };

    map.current.on("click", handleMapClick);

    return () => {
      if (map.current) {
        map.current.off("click", handleMapClick);
      }
    };
  }, [circleMode, circleCenter, onZonesChange]);

  // Update circle button active state when circleMode changes
  useEffect(() => {
    const circleButton = document.getElementById('draw-circle-btn');
    if (circleButton) {
      if (circleMode) {
        circleButton.classList.add('active');
      } else {
        circleButton.classList.remove('active');
      }
    }
  }, [circleMode]);

  const changeMapLayer = (layer: MapLayer) => {
    if (!map.current) return;

    const features = draw.current?.getAll();

    let style: any;
    switch (layer) {
      case "satellite":
        style = {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: 'Tiles &copy; Esri',
            },
          },
          layers: [{ id: "satellite", type: "raster", source: "satellite" }],
        };
        break;
      case "terrain":
        style = {
          version: 8,
          sources: {
            terrain: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: 'Tiles &copy; Esri',
            },
          },
          layers: [{ id: "terrain", type: "raster", source: "terrain" }],
        };
        break;
      case "topo":
        style = {
          version: 8,
          sources: {
            topo: {
              type: "raster",
              tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 17,
              attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            },
          },
          layers: [{ id: "topo", type: "raster", source: "topo" }],
        };
        break;
      case "street":
      default:
        style = "https://tiles.openfreemap.org/styles/liberty";
        break;
    }

    if (map.current.hasControl(draw.current as any)) {
      map.current.removeControl(draw.current as any);
    }
    draw.current = null; // Clear the old draw instance

    map.current.setStyle(style);
    setMapLayer(layer);
    setShowLayerMenu(false);

    if (onMapLayerChange) {
      onMapLayerChange(layer);
    }

    map.current.once("styledata", () => {
      if (!map.current) return;

      console.log("Style loaded, waiting for map to be fully ready...");

      // Wait for map to be fully idle before adding layers
      map.current.once("idle", () => {
        if (!map.current) return;

        console.log("Map idle, re-adding custom layers...");

        // Re-initialize MapboxDraw after style load
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
            // Farm boundary - distinct purple color with white outline
            {
              id: "gl-draw-polygon-fill-boundary",
              type: "fill",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["==", "user_zone_type", "farm_boundary"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "fill-color": "#9333ea",
                "fill-opacity": 0,
              },
            },
            {
              id: "gl-draw-polygon-stroke-boundary-outline",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["==", "user_zone_type", "farm_boundary"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 5,
                "line-dasharray": [2, 2],
              },
            },
            {
              id: "gl-draw-polygon-stroke-boundary",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["==", "user_zone_type", "farm_boundary"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "line-color": "#9333ea",
                "line-width": 3,
                "line-dasharray": [2, 2],
              },
            },
            // Regular polygon fill - DISABLED (using custom layer instead)
            {
              id: "gl-draw-polygon-fill",
              type: "fill",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["!=", "user_zone_type", "farm_boundary"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "fill-color": "#ffffff",
                "fill-opacity": 0, // Transparent - custom layer handles colors
              },
            },
            // Regular polygon outline - white background (only during editing)
            {
              id: "gl-draw-polygon-stroke-outline",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["!=", "user_zone_type", "farm_boundary"],
                ["==", "mode", "direct_select"], // Only show during editing
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 5,
              },
            },
            // Regular polygon outline - DISABLED (using custom layer instead)
            {
              id: "gl-draw-polygon-stroke",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "Polygon"],
                ["!=", "user_zone_type", "farm_boundary"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 0, // Transparent - custom layer handles colors
              },
            },
            // Line strings - DISABLED (using custom layer instead)
            {
              id: "gl-draw-line-outline",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "LineString"],
                ["==", "mode", "direct_select"], // Only during editing
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 5,
              },
            },
            // Line strings - DISABLED (using custom layer instead)
            {
              id: "gl-draw-line",
              type: "line",
              filter: [
                "all",
                ["==", "$type", "LineString"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 0, // Transparent - custom layer handles colors
              },
            },
            // Points - DISABLED (using custom layer instead)
            {
              id: "gl-draw-point-outline",
              type: "circle",
              filter: [
                "all",
                ["==", "$type", "Point"],
                ["==", "mode", "direct_select"], // Only during editing
              ],
              paint: {
                "circle-radius": 8,
                "circle-color": "#ffffff",
              },
            },
            // Points - DISABLED (using custom layer instead)
            {
              id: "gl-draw-point",
              type: "circle",
              filter: [
                "all",
                ["==", "$type", "Point"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "circle-radius": 0, // Transparent - custom layer handles colors
                "circle-color": "#ffffff",
              },
            },
            // Vertex points - black outline
            {
              id: "gl-draw-polygon-and-line-vertex-outline",
              type: "circle",
              filter: [
                "all",
                ["==", "meta", "vertex"],
                ["!=", "mode", "static"],
              ],
              paint: {
                "circle-radius": 7,
                "circle-color": "#000000",
              },
            },
            // Vertex points - white with green stroke
            {
              id: "gl-draw-polygon-and-line-vertex",
              type: "circle",
              filter: [
                "all",
                ["==", "meta", "vertex"],
                ["!=", "mode", "static"],
              ],
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
        map.current.addControl(new maplibregl.NavigationControl(), "top-right");

        // Re-add custom circle button to the draw control panel
        setTimeout(() => {
          // Check if button already exists
          if (document.getElementById('draw-circle-btn')) return;

          const drawControlGroup = document.querySelector('.mapbox-gl-draw_ctrl-draw-btn');
          if (drawControlGroup?.parentElement) {
            const circleButton = document.createElement('button');
            circleButton.className = 'mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_circle';
            circleButton.id = 'draw-circle-btn';
            circleButton.setAttribute('title', 'Circle tool (c)');
            circleButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

            // Insert after polygon button (3rd button)
            const polygonBtn = drawControlGroup.parentElement.children[2];
            if (polygonBtn) {
              polygonBtn.after(circleButton);
            }

            circleButton.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              setCircleMode(prev => !prev);
              setCircleCenter(null);

              // Deactivate other draw tools
              document.querySelectorAll('.mapbox-gl-draw_ctrl-draw-btn').forEach(btn => {
                btn.classList.remove('active');
              });

              if (draw.current) {
                draw.current.changeMode('simple_select');
              }
            });
          }
        }, 100);

        // Re-add grid layers after style change
        console.log("Re-adding grid layers after style change...");
        setupGridLayers();
        updateGrid();

        // Add features back
        console.log("Adding features back to draw, count:", features?.features?.length || 0);
        if (features) {
          draw.current.set(features);
        }

        // Re-add colored zone layers after style change
        console.log("Scheduling colored zone layers re-addition...");
        setTimeout(() => {
          if (!map.current || !draw.current) return;

          console.log("Adding colored zone layers...");

          // Add the draw-zones source
          if (!map.current.getSource("draw-zones")) {
            console.log("Adding draw-zones source");
            map.current.addSource("draw-zones", {
              type: "geojson",
              data: draw.current.getAll(),
            });
          } else {
            console.log("draw-zones source already exists");
          }

          // Add farm boundary layers FIRST
          if (!map.current.getLayer("farm-boundary-outline")) {
            map.current.addLayer({
              id: "farm-boundary-outline",
              type: "line",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["get", "user_zone_type"], "farm_boundary"]
              ],
              paint: {
                "line-color": "#ffffff",
                "line-width": 5,
                "line-dasharray": [2, 2],
              },
            });
          }

          if (!map.current.getLayer("farm-boundary-stroke")) {
            map.current.addLayer({
              id: "farm-boundary-stroke",
              type: "line",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["get", "user_zone_type"], "farm_boundary"]
              ],
              paint: {
                "line-color": "#9333ea",
                "line-width": 3,
                "line-dasharray": [2, 2],
              },
            });
          }

          // Add fill layer with dynamic colors (excluding farm boundary)
          if (!map.current.getLayer("colored-zones-fill")) {
            map.current.addLayer({
              id: "colored-zones-fill",
              type: "fill",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "Polygon"],
                ["!=", ["get", "user_zone_type"], "farm_boundary"]
              ],
              paint: {
                "fill-color": createFillColorExpression(),
                "fill-opacity": createFillOpacityExpression(),
              },
            });
          }

          // Add stroke layer with dynamic colors (excluding farm boundary)
          if (!map.current.getLayer("colored-zones-stroke")) {
            map.current.addLayer({
              id: "colored-zones-stroke",
              type: "line",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "Polygon"],
                ["!=", ["get", "user_zone_type"], "farm_boundary"]
              ],
              paint: {
                "line-color": createStrokeColorExpression(),
                "line-width": 3,
              },
            });
          }

          // Add line layer for LineString features
          if (!map.current.getLayer("colored-lines")) {
            map.current.addLayer({
              id: "colored-lines",
              type: "line",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "LineString"]
              ],
              paint: {
                "line-color": createStrokeColorExpression(),
                "line-width": 3,
              },
            });
          }

          // Add point layer for Point features
          if (!map.current.getLayer("colored-points")) {
            map.current.addLayer({
              id: "colored-points",
              type: "circle",
              source: "draw-zones",
              filter: ["all",
                ["==", ["geometry-type"], "Point"]
              ],
              paint: {
                "circle-color": createFillColorExpression(),
                "circle-radius": 6,
                "circle-stroke-color": createStrokeColorExpression(),
                "circle-stroke-width": 2,
              },
            });
          }

          // CRITICAL: Ensure layer ordering after style change
          console.log("Ensuring custom layers on top...");
          ensureCustomLayersOnTop();

          console.log("Custom layers re-added successfully");
        }, 200); // Increased timeout to ensure draw is fully initialized
      }); // End of idle callback
    }); // End of styledata callback
  };

  const handleLabelZone = () => {
    if (!selectedZone || !draw.current || !zoneLabel.trim()) return;

    const feature = draw.current.get(selectedZone);
    if (feature) {
      console.log("Before update:", feature.properties);

      // Update the feature properties
      const updatedFeature = {
        ...feature,
        properties: {
          ...feature.properties,
          name: zoneLabel,
          user_zone_type: zoneType
        }
      };

      console.log("After update - Zone Type:", zoneType, "Updated feature:", updatedFeature);

      // Delete the old feature and add the updated one
      draw.current.delete(selectedZone);
      const newFeatureIds = draw.current.add(updatedFeature);

      console.log("Feature re-added with IDs:", newFeatureIds);

      // Get all features and log them
      const allFeatures = draw.current.getAll().features;
      console.log("All features after update:", allFeatures.map(f => ({
        id: f.id,
        properties: f.properties
      })));

      onZonesChange(allFeatures);

      // Update the colored zones layer
      if (map.current) {
        const source = map.current.getSource("draw-zones") as maplibregl.GeoJSONSource;
        if (source && draw.current) {
          source.setData(draw.current.getAll());
          console.log("Updated colored zones source");
        }
      }

      // Reset form
      setZoneLabel("");
      setZoneType("other");
      setSelectedZone(null);
    }
  };

  const getFarmBounds = () => {
    if (!draw.current || !map.current) {
      // If no draw or map yet, use viewport bounds
      const bounds = map.current?.getBounds();
      if (!bounds) return null;
      return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
    }

    // Try to find farm_boundary zone
    const allFeatures = draw.current.getAll();
    const farmBoundary = allFeatures.features.find(
      (f: any) => f.properties?.user_zone_type === "farm_boundary"
    );

    if (farmBoundary && farmBoundary.geometry.type === "Polygon") {
      // Calculate bounds from farm boundary polygon
      const coords = farmBoundary.geometry.coordinates[0];
      let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;

      coords.forEach(([lng, lat]) => {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng > east) east = lng;
        if (lng < west) west = lng;
      });

      return { north, south, east, west };
    }

    // If no farm boundary, check if there are any zones at all
    if (allFeatures.features.length > 0) {
      // Use bounds of all zones
      let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;

      allFeatures.features.forEach((f: any) => {
        if (f.geometry.type === "Polygon") {
          const coords = f.geometry.coordinates[0];
          coords.forEach(([lng, lat]: [number, number]) => {
            if (lat > north) north = lat;
            if (lat < south) south = lat;
            if (lng > east) east = lng;
            if (lng < west) west = lng;
          });
        } else if (f.geometry.type === "Point") {
          const [lng, lat] = f.geometry.coordinates;
          if (lat > north) north = lat;
          if (lat < south) south = lat;
          if (lng > east) east = lng;
          if (lng < west) west = lng;
        } else if (f.geometry.type === "LineString") {
          f.geometry.coordinates.forEach(([lng, lat]: [number, number]) => {
            if (lat > north) north = lat;
            if (lat < south) south = lat;
            if (lng > east) east = lng;
            if (lng < west) west = lng;
          });
        }
      });

      if (north !== -Infinity) {
        return { north, south, east, west };
      }
    }

    // Fall back to viewport bounds
    const bounds = map.current.getBounds();
    if (!bounds) return null;
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  };

  const updateGrid = () => {
    if (!map.current) return;

    const farmBounds = getFarmBounds();
    if (!farmBounds) return;

    const viewportBounds = map.current.getBounds();
    const viewport = {
      north: viewportBounds.getNorth(),
      south: viewportBounds.getSouth(),
      east: viewportBounds.getEast(),
      west: viewportBounds.getWest(),
    };

    const zoom = map.current.getZoom();

    // Generate grid lines for entire farm
    const { lines } = generateGridLines(farmBounds, gridUnit);

    // Generate labels only for visible viewport (for AI context)
    // Label density adjusts based on zoom level
    const viewportLabels = generateViewportLabels(farmBounds, viewport, gridUnit, zoom);

    const gridLineSource = map.current.getSource(
      "grid-lines"
    ) as maplibregl.GeoJSONSource;
    const gridLabelSource = map.current.getSource(
      "grid-labels"
    ) as maplibregl.GeoJSONSource;

    if (gridLineSource) {
      gridLineSource.setData({
        type: "FeatureCollection",
        features: lines,
      });
    }

    if (gridLabelSource) {
      gridLabelSource.setData({
        type: "FeatureCollection",
        features: viewportLabels,
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
          className="bg-card text-card-foreground shadow-lg"
        >
          <Layers className="h-4 w-4 mr-2" />
          {mapLayer === "satellite" && "Satellite"}
          {mapLayer === "street" && "Street"}
          {mapLayer === "terrain" && "Terrain"}
          {mapLayer === "topo" && "Topographic"}
        </Button>

        {showLayerMenu && (
          <div className="absolute top-full mt-2 bg-card rounded shadow-lg p-2 space-y-1 min-w-[140px] z-50">
            <button
              onClick={() => changeMapLayer("satellite")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "satellite" ? "bg-accent font-medium" : ""
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => changeMapLayer("terrain")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "terrain" ? "bg-accent font-medium" : ""
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => changeMapLayer("topo")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "topo" ? "bg-accent font-medium" : ""
              }`}
            >
              Topographic
            </button>
            <button
              onClick={() => changeMapLayer("street")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "street" ? "bg-accent font-medium" : ""
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
          onClick={() =>
            setGridUnit(gridUnit === "imperial" ? "metric" : "imperial")
          }
          variant="secondary"
          size="sm"
          className="bg-card text-card-foreground shadow-lg"
        >
          {gridUnit === "imperial" ? "Feet" : "Meters"} ⟷
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
          className="bg-card text-card-foreground shadow-lg"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>

        {showHelp && (
          <div className="absolute bottom-full mb-2 right-0 bg-card rounded shadow-lg p-4 w-80 z-50">
            <h3 className="font-semibold mb-3">
              Drawing Tools (Top-Right Corner)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                  📍
                </div>
                <div>
                  <div className="font-medium">Point Tool</div>
                  <div className="text-muted-foreground text-xs">
                    Click the map to mark locations
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                  📏
                </div>
                <div>
                  <div className="font-medium">Line Tool</div>
                  <div className="text-muted-foreground text-xs">
                    Click points to draw a path. Double-click to finish.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                  ⬡
                </div>
                <div>
                  <div className="font-medium">Polygon Tool</div>
                  <div className="text-muted-foreground text-xs">
                    Click points to draw an area. Double-click to close.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                  ⭕
                </div>
                <div>
                  <div className="font-medium">Circle Tool</div>
                  <div className="text-muted-foreground text-xs">
                    Click center, then click edge to set radius.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                  🗑️
                </div>
                <div>
                  <div className="font-medium">Delete Tool</div>
                  <div className="text-muted-foreground text-xs">
                    Click it, then click a feature to delete
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              <strong>How to use:</strong> Click a tool button in the top-right
              corner, then click on the map to draw. Your cursor will change to
              indicate the active tool.
            </div>
          </div>
        )}
      </div>

      {/* Zone Labeling Panel */}
      {selectedZone && (
        <div className="absolute bottom-4 left-4 bg-card rounded shadow-lg p-4 z-10 w-96 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4" />
            <h3 className="font-medium">Label Zone</h3>
          </div>

          <div className="space-y-3">
            {/* Zone Name Input */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Zone Name
              </label>
              <input
                type="text"
                value={zoneLabel}
                onChange={(e) => setZoneLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLabelZone();
                  }
                }}
                placeholder="e.g., North Garden, Main Pond..."
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-input"
              />
            </div>

            {/* Zone Type Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Zone Type
              </label>
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-input"
              >
                {Object.entries(USER_SELECTABLE_ZONE_TYPES).map(([category, types]) => (
                  <optgroup key={category} label={category}>
                    {types.map((type) => {
                      const config = ZONE_TYPES[type];
                      return (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>

              {/* Color Preview */}
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-8 h-4 rounded border"
                  style={{
                    backgroundColor: getZoneTypeConfig(zoneType).fillColor,
                    opacity: getZoneTypeConfig(zoneType).fillOpacity + 0.5,
                    borderColor: getZoneTypeConfig(zoneType).strokeColor,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  Preview color
                </span>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleLabelZone}
              size="sm"
              disabled={!zoneLabel.trim()}
              className="w-full"
            >
              Save Zone
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Click a zone to select it, then add a label and type
          </p>
        </div>
      )}

      {/* Compass Rose */}
      <CompassRose bearing={bearing} />

      {/* Map Legend */}
      <MapLegend
        mapLayer={mapLayer}
        gridUnit={gridUnit}
        zones={zones}
        isCollapsed={legendCollapsed}
        onToggle={() => setLegendCollapsed(!legendCollapsed)}
      />
    </div>
  );
}