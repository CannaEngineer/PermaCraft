"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Farm, Zone } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Layers, Tag, HelpCircle, Circle, Leaf } from "lucide-react";
import { createCirclePolygon } from "@/lib/map/circle-helper";
import { CompassRose } from "./compass-rose";
import { MapLegend } from "./map-legend";
import { PlantingMarker } from "./planting-marker";
import { SpeciesPickerPanel } from "./species-picker-panel";
import { PlantingForm } from "./planting-form";
import { PlantingDetailPopup } from "./planting-detail-popup";
import { TimelineSlider } from "./timeline-slider";
import { generateGridLines, generateViewportLabels, type GridUnit, type GridDensity } from "@/lib/map/measurement-grid";
import type { Species } from "@/lib/db/schema";
import { ZONE_TYPES, USER_SELECTABLE_ZONE_TYPES, getZoneTypeConfig } from "@/lib/map/zone-types";
import type { FeatureCollection, LineString, Point } from "geojson";
import "../../app/mapbox-draw-override.css";

/**
 * MapLibre Style Expression Generators
 *
 * These functions create MapLibre GL expressions that dynamically style zones
 * based on their `user_zone_type` property. MapLibre expressions are JSON arrays
 * that define conditional logic for paint properties.
 *
 * Why use expressions instead of hardcoded colors?
 * - Single layer can render all zone types with different colors
 * - No need to create 20+ separate layers for each zone type
 * - Performance: MapLibre evaluates expressions on GPU
 *
 * Expression format: ["case", condition1, value1, condition2, value2, ..., defaultValue]
 * Example: ["case", ["==", ["get", "zone_type"], "pond"], "#3b82f6", "#gray"]
 */

/**
 * Creates a MapLibre expression for zone fill colors
 *
 * Returns different fill colors based on the zone's `user_zone_type` property.
 * Each zone type (pond, garden, etc.) has its own distinct color.
 *
 * @returns MapLibre expression array for fill-color paint property
 */
const createFillColorExpression = () => {
  const expression: any = ["case"];
  Object.entries(ZONE_TYPES).forEach(([type, config]) => {
    expression.push(["==", ["get", "user_zone_type"], type]);
    expression.push(config.fillColor);
  });
  expression.push("#64748b"); // default color (gray for "other")
  return expression;
};

/**
 * Creates a MapLibre expression for zone stroke (border) colors
 *
 * @returns MapLibre expression array for line-color paint property
 */
const createStrokeColorExpression = () => {
  const expression: any = ["case"];
  Object.entries(ZONE_TYPES).forEach(([type, config]) => {
    expression.push(["==", ["get", "user_zone_type"], type]);
    expression.push(config.strokeColor);
  });
  expression.push("#475569"); // default color (gray for "other")
  return expression;
};

/**
 * Creates a MapLibre expression for zone fill opacity
 *
 * Different zone types have different transparency levels.
 * For example, ponds are more transparent than gardens.
 *
 * @returns MapLibre expression array for fill-opacity paint property
 */
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

type MapLayer = "satellite" | "mapbox-satellite" | "street" | "terrain" | "topo" | "usgs" | "terrain-3d";

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
  const [gridDensity, setGridDensity] = useState<GridDensity>("auto");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneLabel, setZoneLabel] = useState("");
  const [zoneType, setZoneType] = useState<string>("other");
  const [showHelp, setShowHelp] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [circleMode, setCircleMode] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const circleCenterMarker = useRef<maplibregl.Marker | null>(null);

  // Planting mode state
  const [plantingMode, setPlantingMode] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [showPlantingForm, setShowPlantingForm] = useState(false);
  const [plantingClickPos, setPlantingClickPos] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);

  // Planting filter and detail state
  const [plantingFilters, setPlantingFilters] = useState<string[]>([]); // Empty = show all
  const [selectedPlanting, setSelectedPlanting] = useState<any | null>(null);
  const [showPlantingMenu, setShowPlantingMenu] = useState(false);

  // Guild companion filter state
  const [companionFilterFor, setCompanionFilterFor] = useState<string | undefined>(undefined);

  // Time Machine state - projection year for growth simulation
  const [projectionYear, setProjectionYear] = useState<number>(new Date().getFullYear());

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

  // Load plantings from API
  const loadPlantings = useCallback(async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/plantings`);
      const data = await response.json();
      setPlantings(data.plantings || []);
    } catch (error) {
      console.error('Failed to load plantings:', error);
    }
  }, [farm.id]);

  // Note: Initial planting load is handled in map "load" event
  // This ensures plantings are loaded after map is fully initialized

  // Handle planting click in planting mode - show form
  const handlePlantingClick = useCallback((e: any) => {
    if (!plantingMode || !selectedSpecies || !map.current) return;

    const { lng, lat } = e.lngLat;
    const point = map.current.project([lng, lat]);

    // Show planting form at click position
    setPlantingClickPos({
      x: point.x,
      y: point.y,
      lat,
      lng
    });
    setShowPlantingForm(true);
  }, [plantingMode, selectedSpecies]);

  // Handle planting form submission
  const handlePlantingSubmit = useCallback(async (formData: {
    custom_name?: string;
    planted_year: number;
    zone_id?: string;
    notes?: string;
  }) => {
    if (!selectedSpecies || !plantingClickPos) return;

    try {
      const response = await fetch(`/api/farms/${farm.id}/plantings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species_id: selectedSpecies.id,
          lat: plantingClickPos.lat,
          lng: plantingClickPos.lng,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPlantings(prev => [...prev, data.planting]);

        // Close form
        setShowPlantingForm(false);
        setPlantingClickPos(null);

        // Keep planting mode active for multiple plantings
        // User can click again to place another of the same species
      }
    } catch (error) {
      console.error('Failed to create planting:', error);
    }
  }, [selectedSpecies, plantingClickPos, farm.id]);

  // Handle planting deletion
  const handleDeletePlanting = useCallback(async (plantingId: string) => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/plantings/${plantingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPlantings(prev => prev.filter(p => p.id !== plantingId));
      }
    } catch (error) {
      console.error('Failed to delete planting:', error);
    }
  }, [farm.id]);

  // Filter plantings by layer
  const filteredPlantings = plantingFilters.length === 0
    ? plantings
    : plantings.filter(p => plantingFilters.includes(p.layer));

  // Toggle layer filter
  const toggleLayerFilter = (layer: string) => {
    setPlantingFilters(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

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

  /**
   * Setup Grid Layers
   *
   * Creates the alphanumeric grid system (A1, B2, C3, etc.) that overlays the map.
   * This grid serves two purposes:
   * 1. Visual reference for users
   * 2. Location system for AI recommendations (e.g., "plant at grid D4")
   *
   * Why recreate after style changes?
   * - MapLibre `setStyle()` clears ALL sources and layers
   * - Grid must be re-added each time user switches map layer
   *
   * Grid System:
   * - Lines: Yellow lines forming grid cells (50ft or 25m spacing)
   * - Labels: Alphanumeric coordinates at intersections
   * - Opacity: Increases with zoom level (barely visible when zoomed out)
   *
   * Performance Note:
   * - Grid is generated dynamically based on farm bounds
   * - Labels only generated for VISIBLE viewport (not entire farm)
   * - This prevents thousands of labels from being rendered
   */
  const setupGridLayers = useCallback(() => {
    if (!map.current) return;

    console.log("setupGridLayers called");

    /**
     * Grid Lines Source
     *
     * GeoJSON source containing all grid lines (vertical and horizontal).
     * Starts empty and is populated by updateGrid() function.
     */
    if (!map.current.getSource("grid-lines")) {
      console.log("Adding grid-lines source");
      map.current.addSource("grid-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    } else {
      console.log("grid-lines source already exists");
    }

    /**
     * Grid Lines Layer
     *
     * Renders yellow grid lines with zoom-dependent opacity.
     * Uses MapLibre interpolate expression for smooth transitions.
     *
     * Opacity mapping:
     * - Zoom 10: 0.15 (subtle)
     * - Zoom 15: 0.4 (moderate)
     * - Zoom 20: 0.6 (prominent)
     */
    if (!map.current.getLayer("grid-lines-layer")) {
      console.log("Adding grid-lines-layer");
      map.current.addLayer({
        id: "grid-lines-layer",
        type: "line",
        source: "grid-lines",
        paint: {
          "line-color": "#ffff00", // Yellow for visibility on satellite imagery
          "line-width": 1,
          "line-opacity": [
            "interpolate", // Smooth transition between zoom levels
            ["linear"],
            ["zoom"],
            10, 0.05,  // Nearly invisible when zoomed out
            13, 0.12,
            15, 0.20,  // Subtle at medium zoom
            17, 0.28,
            20, 0.35   // Visible but not dominant when zoomed in
          ],
        },
      });
    }

    /**
     * Grid Labels Source
     *
     * GeoJSON point features with label text (A1, B2, etc.).
     * Updated dynamically as viewport changes.
     */
    if (!map.current.getSource("grid-labels")) {
      console.log("Adding grid-labels source");
      map.current.addSource("grid-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    } else {
      console.log("grid-labels source already exists");
    }

    /**
     * Grid Labels Layer
     *
     * Renders alphanumeric grid coordinates (A1, B2, etc.) at grid intersections.
     *
     * Text Styling:
     * - Yellow text with black halo for readability on any background
     * - Size increases with zoom (7px at zoom 10, 15px at zoom 20)
     * - text-allow-overlap: true - Labels don't hide when crowded
     *
     * Why allow overlap?
     * - Grid coordinates are critical for AI analysis
     * - Better to have crowded labels than missing references
     * - At higher zooms, labels naturally space out
     */
    if (!map.current.getLayer("grid-labels-layer")) {
      console.log("Adding grid-labels-layer");
      map.current.addLayer({
        id: "grid-labels-layer",
        type: "symbol",
        source: "grid-labels",
        layout: {
          "text-field": ["get", "label"], // Label text from GeoJSON feature property
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 7,  // Tiny labels when zoomed out
            14, 9,
            16, 11,
            18, 13,
            20, 15  // Readable labels when zoomed in
          ],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-allow-overlap": true, // Show all labels even if crowded
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#ffff00", // Yellow (matches grid lines)
          "text-halo-color": "#000000", // Black outline for readability
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

  /**
   * Map Initialization Effect
   *
   * This effect runs once on component mount and sets up:
   * 1. MapLibre GL JS map instance
   * 2. MapboxDraw drawing tools
   * 3. Custom colored zone layers
   * 4. Grid system (alphanumeric coordinates)
   * 5. Event handlers for drawing and editing
   * 6. Farm boundary protection logic
   *
   * Why run only once (empty dependency array)?
   * - MapLibre map instances should never be re-created
   * - All updates happen through refs and event handlers
   * - Re-creating the map would lose all state and cause memory leaks
   *
   * Architecture:
   * - Base map layer (satellite/topo/etc.) from external tile sources
   * - MapboxDraw layers for interactive editing
   * - Custom GeoJSON layers for colored zones (above MapboxDraw)
   * - Grid lines and labels (topmost layer for AI reference)
   */
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    try {
      /**
       * Initialize MapLibre Map
       *
       * MapLibre style format is JSON with:
       * - version: Always 8 (MapLibre style spec version)
       * - sources: Tile sources (raster, vector, geojson)
       * - layers: Visual layers that reference sources
       *
       * We start with satellite imagery from ESRI ArcGIS Online.
       * This is a free tile source with no API key required.
       */
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
              tileSize: 256, // Standard web mercator tile size
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
        maxZoom: 18, // Max zoom to ensure tile availability across all layers
        minZoom: 1,
        // @ts-ignore - preserveDrawingBuffer is valid but missing from type definitions
        preserveDrawingBuffer: true, // Attempts to preserve canvas for screenshots (unreliable)
      });

      /**
       * Initialize MapboxDraw
       *
       * MapboxDraw is a drawing plugin that adds interactive tools for creating
       * and editing GeoJSON features. It provides:
       * - Drawing tools UI (point, line, polygon buttons)
       * - Modes for creating, editing, and selecting features
       * - Customizable styles for features
       *
       * Why customize styles?
       * - Default MapboxDraw styles are bright blue - conflicts with our zone colors
       * - We want farm boundaries to look distinct (purple with dashed outline)
       * - We use CUSTOM LAYERS for zone colors (see below), so we make MapboxDraw
       *   layers transparent (opacity: 0) to avoid double-rendering
       *
       * Custom Layer Strategy:
       * - MapboxDraw handles EDITING (vertices, selection)
       * - Custom GeoJSON layers handle COLORS (based on zone type)
       * - This separation allows dynamic colors without modifying MapboxDraw internals
       */
      draw.current = new MapboxDraw({
        displayControlsDefault: false, // Don't show default control panel (we customize it)
        controls: {
          point: true,
          line_string: true,
          polygon: true,
          trash: true,
        },
        defaultMode: "simple_select", // Start in selection mode, not drawing mode
        styles: [
          /**
           * Farm Boundary Styles
           *
           * Farm boundaries are rendered with a distinct purple color (#9333ea)
           * and dashed white outline. This makes them easily distinguishable from
           * other zones and indicates they're immutable (can't be edited/deleted).
           */
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

      // Add navigation control
      const nav = new maplibregl.NavigationControl();
      map.current.addControl(nav, "top-right");

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
          // Match MapboxDraw's background-image pattern with inline SVG for consistency
          const circleSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="white" stroke-width="2"/></svg>');
          circleButton.style.backgroundImage = `url('data:image/svg+xml;utf8,${circleSvg}')`;
          circleButton.style.backgroundRepeat = 'no-repeat';
          circleButton.style.backgroundPosition = 'center';

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

            // Switch draw to simple_select to deactivate other tools
            if (draw.current) {
              draw.current.changeMode('simple_select');
            }

            // Deactivate other draw tools
            document.querySelectorAll('.mapbox-gl-draw_ctrl-draw-btn').forEach(btn => {
              btn.classList.remove('active');
            });

            // Activate circle button
            circleButton.classList.add('active');
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

        // Load plantings from API
        loadPlantings();

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

      // Update pitch when map tilts
      map.current.on("pitch", () => {
        if (map.current) {
          setPitch(map.current.getPitch());
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

      // Handle mode changes for both circle deselection and farm boundary protection
      map.current.on("draw.modechange", (e: any) => {
        // Deactivate circle mode when switching to other draw tools
        // Modes: draw_point, draw_line_string, draw_polygon, simple_select, direct_select
        if (e.mode && (e.mode === 'draw_point' || e.mode === 'draw_line_string' || e.mode === 'draw_polygon')) {
          setCircleMode(false);
          setCircleCenter(null);
          const circleBtn = document.getElementById('draw-circle-btn');
          if (circleBtn) {
            circleBtn.classList.remove('active');
          }
        }

        // Prevent farm boundary from entering edit mode
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

  // Circle drawing and planting click handler - separate useEffect to avoid stale closure
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      // Handle planting mode first
      if (plantingMode) {
        handlePlantingClick(e);
        return;
      }

      // Handle circle mode
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
  }, [circleMode, circleCenter, plantingMode, handlePlantingClick, onZonesChange]);

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

  /**
   * Change Map Layer (Satellite, Topo, Street, etc.)
   *
   * Switches the base map tile source while preserving all user-drawn features.
   *
   * Process:
   * 1. Save current features from MapboxDraw
   * 2. Remove MapboxDraw control
   * 3. Load new style via setStyle() - THIS CLEARS ALL LAYERS AND SOURCES
   * 4. Wait for styledata and idle events
   * 5. Re-initialize MapboxDraw
   * 6. Re-add all custom layers (colored zones, grid)
   * 7. Restore saved features
   *
   * Why is this so complex?
   * - MapLibre's setStyle() is a nuclear option - it wipes everything
   * - We must manually restore our entire layer stack
   * - Must wait for proper events or risk adding layers to missing style
   *
   * Common Pitfall:
   * - Adding layers too early (before 'idle') causes "source not found" errors
   * - Must ensure base style is fully loaded before adding custom layers
   *
   * @param layer - New map layer to display (satellite, usgs, topo, etc.)
   */
  const changeMapLayer = (layer: MapLayer) => {
    if (!map.current) return;

    // STEP 1: Save all features before style change
    // setStyle() will destroy MapboxDraw, so we must preserve the data
    const features = draw.current?.getAll();

    /**
     * Build new style object for selected layer
     *
     * Each style is a minimal MapLibre style spec with:
     * - version: 8 (required)
     * - sources: Tile source definition
     * - layers: Single raster layer
     *
     * Free tile sources used:
     * - ESRI ArcGIS Online (satellite, terrain)
     * - USGS National Map (topographic)
     * - OpenTopoMap (topographic)
     * - OpenFreeMap (street)
     */
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
      case "mapbox-satellite":
        // Note: Requires MAPBOX_ACCESS_TOKEN in environment variables
        // Free tier: 200,000 tile requests/month
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        if (!mapboxToken) {
          console.warn("Mapbox token not found, falling back to ESRI satellite");
          // Fall back to ESRI if no token
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
        } else {
          style = {
            version: 8,
            sources: {
              'mapbox-satellite': {
                type: "raster",
                tiles: [
                  `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg?access_token=${mapboxToken}`,
                ],
                tileSize: 256,
                attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
              },
            },
            layers: [{ id: "mapbox-satellite", type: "raster", source: "mapbox-satellite" }],
          };
        }
        break;
      case "terrain-3d":
        // 3D terrain with satellite overlay
        const mapboxToken3d = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
        style = {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
            },
            'terrain-dem': {
              type: 'raster-dem',
              url: mapboxToken3d
                ? `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${mapboxToken3d}`
                : 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
              tileSize: 256,
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
      case "usgs":
        style = {
          version: 8,
          sources: {
            usgs: {
              type: "raster",
              tiles: [
                "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 16,
              attribution: '&copy; <a href="https://www.usgs.gov/">USGS</a>',
            },
          },
          layers: [{ id: "usgs", type: "raster", source: "usgs" }],
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

    // setStyle resets map options, so re-enforce maxZoom to prevent "map data not available" errors
    map.current.setMaxZoom(18);

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

        // Enable 3D terrain if on terrain-3d layer
        if (layer === "terrain-3d" && map.current.getSource('terrain-dem')) {
          map.current.setTerrain({
            source: 'terrain-dem',
            exaggeration: 1.5 // Amplify terrain for permaculture slope analysis
          });
          setTerrainEnabled(true);
          console.log("3D terrain enabled");
        } else {
          // Disable terrain for other layers
          if (map.current.getTerrain()) {
            map.current.setTerrain(null);
          }
          setTerrainEnabled(false);
        }

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

        // Re-add navigation control (setStyle removes all controls)
        const nav = new maplibregl.NavigationControl();
        map.current.addControl(nav, "top-right");

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
            // Match MapboxDraw's background-image pattern with inline SVG for consistency
            const circleSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="white" stroke-width="2"/></svg>');
            circleButton.style.backgroundImage = `url('data:image/svg+xml;utf8,${circleSvg}')`;
            circleButton.style.backgroundRepeat = 'no-repeat';
            circleButton.style.backgroundPosition = 'center';

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

              // Switch draw to simple_select to deactivate other tools
              if (draw.current) {
                draw.current.changeMode('simple_select');
              }

              // Deactivate other draw tools
              document.querySelectorAll('.mapbox-gl-draw_ctrl-draw-btn').forEach(btn => {
                btn.classList.remove('active');
              });

              // Activate circle button
              circleButton.classList.add('active');
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

  /**
   * Update Grid Lines and Labels
   *
   * Regenerates the grid overlay based on current farm bounds, viewport, and zoom level.
   *
   * Called when:
   * - Map moves (pan)
   * - Map zooms
   * - Grid unit changes (feet ↔ meters)
   * - Zones change (farm boundary updated)
   *
   * Two-tier approach:
   * 1. Grid LINES: Generated for entire farm bounds
   *    - Always covers the whole property
   *    - Performance: ~100-200 lines even for large farms
   *
   * 2. Grid LABELS: Generated only for visible viewport
   *    - Prevents rendering thousands of labels
   *    - Density adjusts with zoom (fewer labels when zoomed out)
   *    - Critical for AI analysis - labels must be visible in screenshots
   *
   * Performance Optimization:
   * - Uses GeoJSON setData() to update existing sources (no layer recreation)
   * - Label generation is viewport-aware (only visible area)
   * - MapLibre culls off-screen features automatically
   *
   * Grid Coordinate System:
   * - Columns: A, B, C, ... (west to east)
   * - Rows: 1, 2, 3, ... (south to north)
   * - Spacing: 50 feet (imperial) or 25 meters (metric)
   * - Example: "D4" refers to column D, row 4
   */
  const updateGrid = useCallback(() => {
    if (!map.current) return;

    // Get farm bounds (from farm_boundary zone or all zones)
    const farmBounds = getFarmBounds();
    if (!farmBounds) return;

    // Get current viewport bounds
    const viewportBounds = map.current.getBounds();
    const viewport = {
      north: viewportBounds.getNorth(),
      south: viewportBounds.getSouth(),
      east: viewportBounds.getEast(),
      west: viewportBounds.getWest(),
    };

    const zoom = map.current.getZoom();

    /**
     * Generate grid lines for ENTIRE farm
     *
     * Lines span the full property from west to east and north to south.
     * This ensures the grid is always visible regardless of pan/zoom.
     * Now adaptive - spacing adjusts with zoom level and user preference.
     */
    const { lines } = generateGridLines(farmBounds, gridUnit, zoom, gridDensity);

    /**
     * Generate labels ONLY for visible viewport
     *
     * This is a performance optimization. Without viewport filtering,
     * a large farm could have thousands of labels, causing:
     * - Slow rendering
     * - Memory issues
     * - Crowded screenshots
     *
     * Zoom-based density:
     * - Low zoom: Sparse labels (every 4th intersection)
     * - High zoom: Dense labels (every intersection)
     */
    const viewportLabels = generateViewportLabels(farmBounds, viewport, gridUnit, zoom, gridDensity);

    // Update GeoJSON sources with new data
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
  }, [gridUnit, gridDensity]);

  // Trigger grid update when density or unit changes
  useEffect(() => {
    if (map.current) {
      updateGrid();
    }
  }, [gridDensity, gridUnit, updateGrid]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="h-full w-full"
        style={{ cursor: plantingMode && selectedSpecies ? 'crosshair' : 'default' }}
      />

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
          {mapLayer === "mapbox-satellite" && "Mapbox Sat"}
          {mapLayer === "terrain-3d" && "3D Terrain"}
          {mapLayer === "street" && "Street"}
          {mapLayer === "terrain" && "Terrain"}
          {mapLayer === "topo" && "OpenTopoMap"}
          {mapLayer === "usgs" && "USGS Topo"}
        </Button>

        {showLayerMenu && (
          <div className="absolute top-full mt-2 bg-card rounded shadow-lg p-2 space-y-1 min-w-[160px] z-50">
            <button
              onClick={() => changeMapLayer("satellite")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "satellite" ? "bg-accent font-medium" : ""
              }`}
            >
              Satellite (ESRI)
            </button>
            <button
              onClick={() => changeMapLayer("mapbox-satellite")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "mapbox-satellite" ? "bg-accent font-medium" : ""
              }`}
            >
              Mapbox Satellite
            </button>
            <button
              onClick={() => changeMapLayer("terrain-3d")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "terrain-3d" ? "bg-accent font-medium" : ""
              }`}
            >
              3D Terrain
            </button>
            <div className="border-t border-border my-1"></div>
            <button
              onClick={() => changeMapLayer("terrain")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "terrain" ? "bg-accent font-medium" : ""
              }`}
            >
              Terrain Map
            </button>
            <button
              onClick={() => changeMapLayer("topo")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "topo" ? "bg-accent font-medium" : ""
              }`}
            >
              OpenTopoMap
            </button>
            <button
              onClick={() => changeMapLayer("usgs")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "usgs" ? "bg-accent font-medium" : ""
              }`}
            >
              USGS Topo
            </button>
            <button
              onClick={() => changeMapLayer("street")}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                mapLayer === "street" ? "bg-accent font-medium" : ""
              }`}
            >
              Street Map
            </button>
          </div>
        )}
      </div>

      {/* Grid Controls */}
      <div className="absolute top-20 left-4 z-10 flex gap-2">
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

        <div className="relative">
          <Button
            onClick={() => {
              setShowGridMenu(!showGridMenu);
              setShowLayerMenu(false);
              setShowHelp(false);
            }}
            variant="secondary"
            size="sm"
            className="bg-card text-card-foreground shadow-lg"
          >
            Grid: {gridDensity === "auto" ? "Auto" : gridDensity.charAt(0).toUpperCase() + gridDensity.slice(1)} ▾
          </Button>

          {showGridMenu && (
            <div className="absolute top-full mt-2 bg-card rounded shadow-lg p-2 space-y-1 min-w-[140px] z-50">
              <button
                onClick={() => {
                  setGridDensity("auto");
                  setShowGridMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                  gridDensity === "auto" ? "bg-accent font-medium" : ""
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => {
                  setGridDensity("sparse");
                  setShowGridMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                  gridDensity === "sparse" ? "bg-accent font-medium" : ""
                }`}
              >
                Sparse
              </button>
              <button
                onClick={() => {
                  setGridDensity("normal");
                  setShowGridMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                  gridDensity === "normal" ? "bg-accent font-medium" : ""
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => {
                  setGridDensity("dense");
                  setShowGridMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                  gridDensity === "dense" ? "bg-accent font-medium" : ""
                }`}
              >
                Dense
              </button>
              <button
                onClick={() => {
                  setGridDensity("off");
                  setShowGridMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent ${
                  gridDensity === "off" ? "bg-accent font-medium" : ""
                }`}
              >
                Off
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Planting Mode Button */}
      <div className="absolute top-36 left-4 z-10">
        <Button
          onClick={() => {
            if (plantingMode) {
              // Exit planting mode
              setPlantingMode(false);
              setSelectedSpecies(null);
              setShowSpeciesPicker(false);
              setShowPlantingForm(false);
              setPlantingClickPos(null);
            } else {
              // Enter planting mode - show species picker
              setShowSpeciesPicker(true);
            }
          }}
          variant={plantingMode ? 'default' : 'outline'}
          size="sm"
          className={plantingMode ? 'bg-green-600' : 'bg-card text-card-foreground shadow-lg'}
        >
          {plantingMode ? 'Exit Planting Mode' : 'Add Plantings'}
        </Button>
      </div>

      {/* Selected Species Indicator */}
      {plantingMode && selectedSpecies && !showSpeciesPicker && (
        <div className="absolute top-52 left-4 z-10 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-xs font-medium">Planting:</div>
          <div className="font-semibold">{selectedSpecies.common_name}</div>
          <div className="text-xs opacity-90 italic">{selectedSpecies.scientific_name}</div>
        </div>
      )}

      {/* Planting Filter Menu */}
      {plantings.length > 0 && !plantingMode && (
        <div className="absolute top-52 left-4 z-10">
          <Button
            onClick={() => {
              setShowPlantingMenu(!showPlantingMenu);
              setShowLayerMenu(false);
              setShowHelp(false);
            }}
            variant="secondary"
            size="sm"
            className="bg-card text-card-foreground shadow-lg"
          >
            <Leaf className="h-4 w-4 mr-2" />
            Filter Plants ({filteredPlantings.length}/{plantings.length})
          </Button>

          {showPlantingMenu && (
            <div className="absolute top-full mt-2 bg-card rounded shadow-lg p-2 space-y-1 min-w-[180px] z-50">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                Show by Layer
              </div>
              {['canopy', 'understory', 'shrub', 'herbaceous', 'groundcover', 'vine', 'root', 'aquatic'].map(layer => {
                const layerCount = plantings.filter(p => p.layer === layer).length;
                if (layerCount === 0) return null;

                return (
                  <button
                    key={layer}
                    onClick={() => toggleLayerFilter(layer)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent flex items-center justify-between ${
                      plantingFilters.length === 0 || plantingFilters.includes(layer)
                        ? 'bg-accent/50 font-medium'
                        : 'opacity-50'
                    }`}
                  >
                    <span className="capitalize">{layer}</span>
                    <span className="text-xs text-muted-foreground">{layerCount}</span>
                  </button>
                );
              })}
              {plantingFilters.length > 0 && (
                <>
                  <div className="border-t border-border my-1"></div>
                  <button
                    onClick={() => setPlantingFilters([])}
                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-accent text-muted-foreground"
                  >
                    Show All
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3D Terrain Controls - positioned at bottom right when terrain enabled */}
      {terrainEnabled && (
        <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-2">
          <Button
            onClick={() => {
              if (map.current) {
                const currentPitch = map.current.getPitch();
                map.current.easeTo({ pitch: currentPitch >= 60 ? 0 : currentPitch + 15, duration: 500 });
              }
            }}
            variant="secondary"
            size="sm"
            className="bg-card text-card-foreground shadow-lg"
            title="Tilt up (increase pitch)"
          >
            ⬆️ Tilt
          </Button>
          <Button
            onClick={() => {
              if (map.current) {
                const currentPitch = map.current.getPitch();
                map.current.easeTo({ pitch: Math.max(0, currentPitch - 15), duration: 500 });
              }
            }}
            variant="secondary"
            size="sm"
            className="bg-card text-card-foreground shadow-lg"
            title="Tilt down (decrease pitch)"
          >
            ⬇️ Flat
          </Button>
          <Button
            onClick={() => {
              if (map.current) {
                map.current.easeTo({ bearing: 0, pitch: 0, duration: 500 });
              }
            }}
            variant="secondary"
            size="sm"
            className="bg-card text-card-foreground shadow-lg"
            title="Reset view to north-up, flat"
          >
            🧭 Reset
          </Button>
        </div>
      )}

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
        plantings={plantings}
        isCollapsed={legendCollapsed}
        onToggle={() => setLegendCollapsed(!legendCollapsed)}
      />

      {/* Render planting markers */}
      {map.current && filteredPlantings.map(planting => (
        <PlantingMarker
          key={planting.id}
          planting={planting}
          map={map.current!}
          currentYear={projectionYear}
          onClick={(p) => {
            setSelectedPlanting(p);
          }}
        />
      ))}

      {/* Species Picker Panel */}
      {showSpeciesPicker && (
        <SpeciesPickerPanel
          farmId={farm.id}
          companionFilterFor={companionFilterFor}
          onSelectSpecies={(species) => {
            setSelectedSpecies(species);
            setPlantingMode(true);
            setShowSpeciesPicker(false);
            setCompanionFilterFor(undefined); // Clear companion filter after selection
          }}
          onClose={() => {
            setShowSpeciesPicker(false);
            setCompanionFilterFor(undefined); // Clear companion filter on close
            if (!selectedSpecies) {
              setPlantingMode(false);
            }
          }}
        />
      )}

      {/* Planting Form */}
      {showPlantingForm && selectedSpecies && plantingClickPos && (
        <PlantingForm
          species={selectedSpecies}
          position={{ x: plantingClickPos.x, y: plantingClickPos.y }}
          zones={zones}
          onSubmit={handlePlantingSubmit}
          onCancel={() => {
            setShowPlantingForm(false);
            setPlantingClickPos(null);
          }}
        />
      )}

      {/* Planting Detail Popup */}
      {selectedPlanting && (
        <PlantingDetailPopup
          planting={selectedPlanting}
          onClose={() => setSelectedPlanting(null)}
          onDelete={handleDeletePlanting}
          onShowCompanions={(plantCommonName) => {
            setCompanionFilterFor(plantCommonName);
            setShowSpeciesPicker(true);
          }}
        />
      )}

      {/* Time Machine Slider - only show if there are plantings */}
      {plantings.length > 0 && (
        <TimelineSlider
          currentYear={projectionYear}
          onYearChange={setProjectionYear}
        />
      )}
    </div>
  );
}