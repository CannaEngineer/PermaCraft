"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FarmMap } from "@/components/map/farm-map";
import { EnhancedChatPanel } from "@/components/ai/enhanced-chat-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SaveIcon, MessageSquare, Trash2, Target } from "lucide-react";
import type { Farm, Zone, FarmerGoal } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { calculateGridCoordinates, formatGridRange } from "@/lib/map/zone-grid-calculator";
import { toPng } from "html-to-image";
import { DeleteFarmDialog } from "@/components/shared/delete-farm-dialog";
import { FarmSettingsButton } from "@/components/farm/farm-settings-button";
import { GoalCaptureWizard } from "@/components/farm/goal-capture-wizard";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
  initialIsPublic: boolean;
}

export function FarmEditorClient({
  farm,
  initialZones,
  isOwner,
  initialIsPublic,
}: FarmEditorClientProps) {
  const router = useRouter();
  const [zones, setZones] = useState<any[]>(initialZones);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);
  const [goals, setGoals] = useState<FarmerGoal[]>([]);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const mapComponentCallbacksRef = useRef<{
    changeMapLayer?: (layer: string) => void;
  }>({});

  /**
   * Build legend context text for AI
   * Returns structured text describing map configuration and zones
   */
  const buildLegendContext = useCallback(() => {
    const layerNames: Record<string, string> = {
      satellite: "Satellite Imagery",
      terrain: "Terrain Map",
      topo: "OpenTopoMap",
      usgs: "USGS Topographic",
      street: "Street Map",
    };

    const zonesList = zones
      .map((z) => {
        const name = z.name || (z.properties ? JSON.parse(z.properties).name : null) || "Unlabeled";
        const type = z.zone_type || "other";
        return `  - ${name}: ${type}`;
      })
      .join("\n");

    return `
Map Configuration:
- Layer: ${layerNames[currentMapLayer as keyof typeof layerNames] || currentMapLayer}
- Grid System: A1, B2, C3 (columns west-to-east, rows south-to-north)
- Grid Spacing: 50ft (imperial) / 25m (metric)

Farm Boundary: Purple dashed outline (immutable)

Zones on map:
${zonesList || "  - No zones labeled yet"}
    `.trim();
  }, [currentMapLayer, zones]);

  /**
   * Build native species context text for AI
   * Returns structured text describing native species recommendations
   */
  const buildNativeSpeciesContext = useCallback(() => {
    if (nativeSpecies.length === 0) {
      return 'No native species data available yet.';
    }

    const speciesList = nativeSpecies.map(s => {
      const functions = s.permaculture_functions
        ? JSON.parse(s.permaculture_functions).join(', ')
        : '';

      const zones = s.min_hardiness_zone && s.max_hardiness_zone
        ? `Zones ${s.min_hardiness_zone}-${s.max_hardiness_zone}`
        : '';

      return `  - ${s.common_name} (${s.scientific_name}): ${s.layer}, ${s.mature_height_ft}ft, ${zones}, functions: ${functions}`;
    }).join('\n');

    return `
Native Species Available for This Farm (Perfect Matches):
${speciesList}

When suggesting plants, prioritize these natives and explain their permaculture functions.
    `.trim();
  }, [nativeSpecies]);

  /**
   * Build goals context text for AI
   * Returns structured text describing farmer's goals for prioritization
   */
  const buildGoalsContext = useCallback(() => {
    if (goals.length === 0) {
      return 'No specific goals defined yet. The farmer has not set any specific objectives.';
    }

    const goalsList = goals.map(goal => {
      const priorityMap: Record<number, string> = {
        1: 'lowest',
        2: 'low',
        3: 'medium',
        4: 'high',
        5: 'highest'
      };
      const priorityText = priorityMap[goal.priority] || 'medium';

      const timelineText = {
        'short': 'short-term (1 year)',
        'medium': 'medium-term (2-3 years)',
        'long': 'long-term (4+ years)'
      }[goal.timeline as keyof { short: string; medium: string; long: string }] || goal.timeline;

      let goalText = `  - ${goal.description} (${goal.goal_category}, ${priorityText} priority, ${timelineText})`;

      if (goal.targets) {
        try {
          const targets = JSON.parse(goal.targets as string);
          if (Array.isArray(targets) && targets.length > 0) {
            goalText += ` - Targets: ${targets.join(', ')}`;
          }
        } catch (e) {
          console.error("Failed to parse targets for goal:", goal.id);
        }
      }

      return goalText;
    }).join('\n');

    return `
FARMER GOALS (${goals.length} total):
${goalsList}

When making recommendations, prioritize suggestions that help achieve these specific goals,
especially those with higher priority ratings. Align your suggestions with the appropriate
timeline horizons (short, medium, or long-term).
    `.trim();
  }, [goals]);

  /**
   * Build plantings context text for AI
   * Returns structured text describing existing plantings on the farm
   */
  const buildPlantingsContext = useCallback(() => {
    if (plantings.length === 0) {
      return 'No plantings added to this farm yet.';
    }

    const currentYear = new Date().getFullYear();

    const plantingsList = plantings.map(p => {
      const age = currentYear - (p.planted_year || currentYear);
      const customName = p.name ? ` "${p.name}"` : '';
      const size = p.mature_height_ft ? ` (mature: ${p.mature_height_ft}ft high)` : '';
      const notes = p.notes ? ` - Notes: ${p.notes}` : '';
      const commonName = p.common_name || 'Unknown plant';
      const scientificName = p.scientific_name || 'Unknown species';
      const layer = p.layer || 'unknown';

      return `  - ${commonName}${customName} (${scientificName}): ${layer} layer, planted ${p.planted_year || currentYear} (${age} years old)${size}, at ${(p.lat || 0).toFixed(6)}, ${(p.lng || 0).toFixed(6)}${notes}`;
    }).join('\n');

    return `
Existing Plantings on This Farm (${plantings.length} total):
${plantingsList}

IMPORTANT: When suggesting new plantings:
- DO NOT suggest duplicates of species already planted
- Consider spacing requirements relative to existing plantings
- Suggest companion plants that work well with what's already there
- Consider the mature size and spacing of existing plants
- Recommend guild arrangements around established plantings
    `.trim();
  }, [plantings]);

  // Load native species for AI context
  useEffect(() => {
    if (farm?.id) {
      loadNativeSpecies();
    }
  }, [farm?.id]);

  // Load plantings for AI context
  useEffect(() => {
    if (farm?.id) {
      loadPlantings();
    }
  }, [farm?.id]);

  // Load goals for AI context
  useEffect(() => {
    if (farm?.id) {
      loadGoals();
    }
  }, [farm?.id]);

  const loadGoals = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/goals`);
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadNativeSpecies = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/native-species`);
      const data = await response.json();
      // Get top 10 perfect matches for AI context
      setNativeSpecies(data.perfect_match?.slice(0, 10) || []);
    } catch (error) {
      console.error('Failed to load native species:', error);
    }
  };

  const loadPlantings = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/plantings`);
      const data = await response.json();
      setPlantings(data.plantings || []);
    } catch (error) {
      console.error('Failed to load plantings:', error);
    }
  };

  useEffect(() => {
    const handleCloseChat = () => {
      setIsChatOpen(false);
    };
    window.addEventListener("close-chat", handleCloseChat);
    return () => {
      window.removeEventListener("close-chat", handleCloseChat);
    };
  }, []);

  // Handle URL parameters for deep linking (from search results)
  useEffect(() => {
    // Check if chat should be opened via query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('chat') === 'open') {
      setIsChatOpen(true);

      // Check if specific conversation should be loaded
      const conversationId = params.get('conversation');
      if (conversationId) {
        setInitialConversationId(conversationId);
      }
    }

    // Check if we should zoom to a specific zone via hash
    const hash = window.location.hash;
    if (hash.startsWith('#zone-')) {
      const zoneId = hash.substring(6); // Remove '#zone-' prefix
      // TODO: Implement zone zoom functionality when map is ready
      console.log('TODO: Zoom to zone:', zoneId);
    }
  }, []);

  const handleSave = async (showAlert = true) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        throw new Error("Failed to save zones");
      }

      setHasUnsavedChanges(false);
      if (showAlert) {
        alert("Zones saved successfully!");
      }
    } catch (error) {
      if (showAlert) {
        alert("Failed to save zones");
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      // Auto-save after 2 seconds of inactivity
      autoSaveTimer.current = setTimeout(() => {
        handleSave(false);
      }, 2000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [zones, hasUnsavedChanges]);

  // Handle zones change with unsaved flag
  const handleZonesChange = (newZones: any[]) => {
    setZones(newZones);
    setHasUnsavedChanges(true);
  };

  /**
   * Captures a single screenshot of the current map state
   *
   * This function handles the complex process of capturing MapLibre canvas
   * content along with HTML overlays (compass, legend, grid labels).
   *
   * Process:
   * 1. Wait for all map tiles to finish loading
   * 2. Capture the raw canvas via MapLibre API
   * 3. Create a temporary image from canvas data
   * 4. Use html-to-image to capture the full container (canvas + overlays)
   * 5. Clean up temporary elements
   *
   * Why this complexity?
   * - MapLibre's preserveDrawingBuffer doesn't work reliably across browsers
   * - We need to capture both WebGL canvas AND HTML elements (grid, compass)
   * - Must avoid blank screenshots by ensuring tiles are fully loaded
   *
   * @returns Base64 encoded PNG data URI of the screenshot
   * @throws Error if map is not ready or screenshot capture fails
   */
  const captureMapScreenshot = useCallback(async (): Promise<string> => {
    if (!mapContainerRef.current || !mapRef.current) {
      throw new Error("Map not ready");
    }

    // Wait for map to be fully loaded and ALL tiles rendered
    // This is critical - capturing too early results in blank/partial screenshots
    await new Promise<void>((resolve) => {
      let tilesLoaded = false;
      let idleCount = 0;

      const checkReady = () => {
        // Check if all source tiles are loaded by inspecting MapLibre internal state
        // This ensures we don't capture while tiles are still downloading
        const style = mapRef.current!.getStyle();
        const sourcesLoaded = Object.keys(style.sources).every(sourceId => {
          const source = mapRef.current!.getSource(sourceId);
          // @ts-ignore - Accessing MapLibre internal _tiles property
          // This is necessary because there's no public API to check tile load status
          return !source || !source._tiles || Object.keys(source._tiles).length === 0 ||
                 // @ts-ignore
                 Object.values(source._tiles).every((tile: any) => tile.state === 'loaded');
        });

        // Require three conditions to be true simultaneously:
        // 1. All tiles loaded (checked above)
        // 2. Map reports loaded state
        // 3. Map is not currently panning/zooming
        if (sourcesLoaded && mapRef.current!.loaded() && !mapRef.current!.isMoving()) {
          idleCount++;
          console.log(`Map ready check ${idleCount}/3, tiles loaded: ${sourcesLoaded}`);

          // Require 3 consecutive successful checks to avoid race conditions
          // Single check isn't reliable - tiles can report loaded before fully rendered
          if (idleCount >= 3) {
            tilesLoaded = true;
            console.log("Map is fully ready for screenshot");
            setTimeout(() => resolve(), 500); // Final 500ms delay for GPU rendering
          } else {
            setTimeout(checkReady, 200); // Check again in 200ms
          }
        } else {
          // If conditions not met, reset counter and wait for next idle event
          idleCount = 0;
          mapRef.current!.once("idle", checkReady);
        }
      };

      checkReady();

      // Safety timeout: If tiles don't load within 10 seconds, proceed anyway
      // This prevents infinite waiting if there are network issues
      setTimeout(() => {
        if (!tilesLoaded) {
          console.warn("Map screenshot timeout - capturing anyway");
          resolve();
        }
      }, 10000);
    });

    let screenshotData: string;
    try {
      console.log("Starting screenshot capture - will capture on next render...");

      if (!mapContainerRef.current || !mapRef.current) {
        throw new Error("Map container not available");
      }

      const canvas = mapRef.current.getCanvas();

      /**
       * Captures the MapLibre canvas during a render event
       *
       * Why use render event?
       * - preserveDrawingBuffer doesn't work reliably
       * - Canvas content is only available during/after render
       * - Capturing immediately after triggerRepaint() ensures fresh content
       */
      const captureCanvasOnRender = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          let captured = false;

          const captureHandler = () => {
            if (captured) return; // Prevent duplicate captures
            captured = true;

            // Capture canvas content immediately during this render frame
            // Must happen synchronously within the render event callback
            try {
              const dataUrl = canvas.toDataURL("image/png", 1.0);
              console.log("Canvas captured on render:", {
                width: canvas.width,
                height: canvas.height,
                dataSize: dataUrl.length,
                isBlank: dataUrl.length < 50000,
              });

              if (dataUrl.length < 50000) {
                reject(new Error("Canvas is still blank after render"));
              } else {
                resolve(dataUrl);
              }
            } catch (error) {
              reject(error);
            }
          };

          // Trigger a render and capture on the very next render event
          mapRef.current!.once('render', captureHandler);
          mapRef.current!.triggerRepaint();

          // Timeout after 3 seconds
          setTimeout(() => {
            if (!captured) {
              captured = true;
              reject(new Error("Screenshot capture timed out"));
            }
          }, 3000);
        });
      };

      const canvasDataUrl = await captureCanvasOnRender();

      console.log("Canvas successfully captured!");

      // Create a temporary image element to hold the canvas content
      const tempImg = document.createElement('img');
      tempImg.src = canvasDataUrl;
      tempImg.style.position = 'absolute';
      tempImg.style.top = '0';
      tempImg.style.left = '0';
      tempImg.style.width = '100%';
      tempImg.style.height = '100%';
      tempImg.style.pointerEvents = 'none';
      tempImg.style.zIndex = '0';
      tempImg.className = 'temp-screenshot-canvas';

      // Wait for image to load
      await new Promise((resolve) => {
        tempImg.onload = resolve;
        tempImg.onerror = resolve;
      });

      // Insert the temp image
      const mapCanvas = mapContainerRef.current.querySelector('canvas');
      if (mapCanvas && mapCanvas.parentElement) {
        mapCanvas.parentElement.insertBefore(tempImg, mapCanvas);
        (mapCanvas as HTMLElement).style.opacity = '0';
      }

      console.log("Capturing composite with overlays...");

      // Capture the entire container with html-to-image
      // Filter out the bottom drawer, map controls, and other UI elements
      screenshotData = await toPng(mapContainerRef.current, {
        quality: 0.9,
        pixelRatio: 1,
        cacheBust: false,
        skipFonts: true,
        filter: (node) => {
          if (node.classList) {
            if (node.classList.contains('temp-screenshot-canvas')) return true;
            // Filter out map controls
            if (node.classList.contains('maplibregl-ctrl')) return false;
            if (node.classList.contains('mapboxgl-ctrl')) return false;
          }
          // Filter out bottom drawer by data attribute
          if ((node as HTMLElement).hasAttribute && (node as HTMLElement).hasAttribute('data-bottom-drawer')) {
            return false;
          }
          return true;
        },
      });

      // Clean up
      tempImg.remove();
      if (mapCanvas) {
        (mapCanvas as HTMLElement).style.opacity = '1';
      }

      console.log("Cleanup complete");

      // Verify screenshot
      if (!screenshotData || screenshotData === "data:,") {
        throw new Error("Screenshot is empty");
      }

      const base64Length = screenshotData.replace(/^data:image\/\w+;base64,/, "").length;

      console.log("Screenshot captured successfully:", {
        totalSize: screenshotData.length,
        base64Size: base64Length,
        preview: screenshotData.substring(0, 100),
      });

      if (base64Length < 1000) {
        throw new Error("Screenshot appears to be blank.");
      }

      return screenshotData;

    } catch (error) {
      console.error("Screenshot capture error:", error);
      // Clean up in case of error
      const tempImg = mapContainerRef.current?.querySelector('.temp-screenshot-canvas');
      if (tempImg) tempImg.remove();
      const mapCanvas = mapContainerRef.current?.querySelector('canvas');
      if (mapCanvas) (mapCanvas as HTMLElement).style.opacity = '1';

      throw new Error(
        "Failed to capture map screenshot. Please ensure the map is fully loaded and try again."
      );
    }
  }, [mapContainerRef, mapRef]);

  /**
   * Handles AI analysis requests with automatic dual-screenshot capture
   *
   * This is the core function for AI-powered permaculture analysis.
   * It captures BOTH satellite and topographic views automatically,
   * allowing the AI to correlate visual features with terrain data.
   *
   * Process Flow:
   * 1. Capture screenshot of current layer (whatever user is viewing)
   * 2. Temporarily switch to USGS topographic layer (invisible to user)
   * 3. Capture topographic screenshot
   * 4. Restore original layer
   * 5. Send both screenshots + farm context to AI API
   * 6. Return AI response with recommendations
   *
   * Why dual screenshots?
   * - Satellite shows visual features (buildings, vegetation, water)
   * - Topographic shows terrain (slopes, elevation, drainage)
   * - AI correlates both for terrain-aware recommendations
   *
   * Performance Notes:
   * - Layer switching happens in ~2-3 seconds total
   * - User never sees the temporary layer switch
   * - Screenshots are ~500KB each (base64 PNG)
   *
   * @param query - User's question/request for the AI
   * @param conversationId - Optional existing conversation to continue
   * @returns AI response with conversation metadata and screenshot
   */
  const handleAnalyze = useCallback(
    async (
      query: string,
      conversationId?: string
    ): Promise<{
      response: string;
      conversationId: string;
      analysisId: string;
      screenshot: string;
      generatedImageUrl?: string | null;
    }> => {
      if (!mapContainerRef.current || !mapRef.current) {
        throw new Error("Map not ready");
      }

      console.log("=== DUAL SCREENSHOT CAPTURE START ===");

      // STEP 1: Capture current layer screenshot
      // This preserves what the user is actively viewing
      console.log(`Capturing screenshot 1: ${currentMapLayer} layer`);
      const currentLayerScreenshot = await captureMapScreenshot();

      // STEP 2: Determine second screenshot layer
      // Goal: Always provide two DIFFERENT perspectives
      // - If on satellite/mapbox-satellite/street/terrain-3d: capture USGS topo as second view
      // - If on topo layers (topo/usgs/terrain): capture satellite as second view
      const originalLayer = currentMapLayer;
      const isTopoLayer = originalLayer === "usgs" || originalLayer === "topo" || originalLayer === "terrain";

      // Choose complementary layer: satellite if on topo, USGS topo if on satellite
      const secondLayer = isTopoLayer ? "satellite" : "usgs";
      const secondLayerLabel = isTopoLayer ? "Satellite" : "USGS Topo";

      let secondScreenshot: string;

      console.log(`Switching to ${secondLayerLabel} layer for second screenshot...`);

      // Store current map style to restore later
      const currentStyle = mapRef.current.getStyle();

      // Create the second layer style
      let secondStyle;
      if (isTopoLayer) {
        // Switch to satellite (ESRI World Imagery)
        secondStyle = {
          version: 8 as const,
          sources: {
            satellite: {
              type: "raster" as const,
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 19,
            },
          },
          layers: [{ id: "satellite", type: "raster" as const, source: "satellite" }],
        };
      } else {
        // Switch to USGS topo
        secondStyle = {
          version: 8 as const,
          sources: {
            usgs: {
              type: "raster" as const,
              tiles: [
                "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 16,
            },
          },
          layers: [{ id: "usgs", type: "raster" as const, source: "usgs" }],
        };
      }

      // Temporarily switch to second style
      mapRef.current.setStyle(secondStyle);

      // Wait for the new style to load and tiles to render
      await new Promise<void>((resolve) => {
        const onStyleData = () => {
          console.log(`${secondLayerLabel} style loaded, waiting for tiles...`);
          mapRef.current!.once("idle", () => {
            console.log(`${secondLayerLabel} tiles idle`);
            setTimeout(() => resolve(), 1000);
          });
        };

        if (mapRef.current!.isStyleLoaded()) {
          onStyleData();
        } else {
          mapRef.current!.once("styledata", onStyleData);
        }

        setTimeout(() => {
          console.warn(`${secondLayerLabel} style load timeout`);
          resolve();
        }, 15000);
      });

      // STEP 3: Capture second screenshot
      console.log(`Capturing screenshot 2: ${secondLayerLabel} layer`);
      secondScreenshot = await captureMapScreenshot();

      // STEP 4: Restore original layer
      console.log(`Restoring original layer: ${originalLayer}`);
      mapRef.current.setStyle(currentStyle);

      await new Promise<void>((resolve) => {
        mapRef.current!.once("styledata", () => {
          mapRef.current!.once("idle", () => {
            setTimeout(() => resolve(), 500);
          });
        });
        setTimeout(() => resolve(), 10000);
      });

      console.log("=== DUAL SCREENSHOT CAPTURE COMPLETE ===");

      // Assign screenshots based on what was captured
      const topoScreenshot = isTopoLayer ? currentLayerScreenshot : secondScreenshot;
      const satelliteScreenshot = isTopoLayer ? secondScreenshot : currentLayerScreenshot;

      // STEP 6: Calculate farm bounds for grid coordinate mapping
      // This allows the AI to reference precise locations using alphanumeric grid (A1, B2, etc.)
      // Grid system:
      // - Columns: A, B, C... (west to east)
      // - Rows: 1, 2, 3... (south to north)
      // - Spacing: 50 feet (imperial) or 25 meters (metric)
      const allCoords: number[][] = [];
      zones.forEach((zone) => {
        const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
        if (geom.type === 'Point') {
          allCoords.push(geom.coordinates);
        } else if (geom.type === 'LineString') {
          allCoords.push(...geom.coordinates);
        } else if (geom.type === 'Polygon') {
          allCoords.push(...geom.coordinates[0]);
        }
      });

      const farmBounds = allCoords.length > 0 ? {
        north: Math.max(...allCoords.map(c => c[1])),
        south: Math.min(...allCoords.map(c => c[1])),
        east: Math.max(...allCoords.map(c => c[0])),
        west: Math.min(...allCoords.map(c => c[0])),
      } : {
        north: farm.center_lat + 0.001,
        south: farm.center_lat - 0.001,
        east: farm.center_lng + 0.001,
        west: farm.center_lng - 0.001,
      };

      // Get AI analysis - send BOTH screenshots, zones with grid coordinates, map layer context, legend context, native species, and existing plantings
      const analyzeRes = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: farm.id,
          conversationId,
          query,
          screenshots: [
            { type: isTopoLayer ? "topo" : "satellite", data: currentLayerScreenshot },
            { type: isTopoLayer ? "satellite" : "topo", data: secondScreenshot },
          ],
          mapLayer: currentMapLayer,
          legendContext: buildLegendContext(), // Include legend data as text
          nativeSpeciesContext: buildNativeSpeciesContext(), // Include native species recommendations
          plantingsContext: buildPlantingsContext(), // Include existing plantings context
          goalsContext: buildGoalsContext(), // Include farmer goals for prioritization
          zones: zones.map((zone) => {
            const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
            const gridCells = calculateGridCoordinates(geom, farmBounds, 'imperial');
            const gridRange = formatGridRange(gridCells);

            return {
              type: zone.zone_type,
              name:
                zone.name ||
                (zone.properties ? JSON.parse(zone.properties).name : null) ||
                "Unlabeled",
              geometryType: geom.type,
              gridCoordinates: gridRange,
              gridCells: gridCells,
            };
          }),
        }),
      });

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.message || errorData.error || "Analysis failed";
        console.error("[Chat] Analysis API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await analyzeRes.json();
      return {
        response: data.response,
        conversationId: data.conversationId,
        analysisId: data.analysisId,
        screenshot: currentLayerScreenshot, // Return primary screenshot for display in chat
        generatedImageUrl: data.generatedImageUrl, // Return AI-generated sketch if created
      };
    },
    [farm.id, currentMapLayer, zones, mapContainerRef, mapRef, captureMapScreenshot, buildLegendContext, buildNativeSpeciesContext, buildPlantingsContext, buildGoalsContext]
  );

  // State for vital recommendations
  const [vitalPrompt, setVitalPrompt] = useState<string | undefined>(undefined);
  const [startNewChat, setStartNewChat] = useState(false);

  /**
   * Handle AI recommendations for specific vital categories
   * Opens chat panel with contextual prompt about the vital
   */
  const handleVitalRecommendations = useCallback(
    (vitalKey: string, vitalLabel: string, currentCount: number, plantList: any[]) => {
      // Build contextual prompt
      let prompt = `I'd like recommendations for ${vitalLabel} on my farm.\n\n`;

      if (currentCount === 0) {
        prompt += `I currently have NO ${vitalLabel} planted. Please recommend:\n`;
        prompt += `1. Why ${vitalLabel} are important for my specific farm\n`;
        prompt += `2. How many ${vitalLabel} I should aim to have based on my farm size\n`;
        prompt += `3. Specific native species that would work well as ${vitalLabel}\n`;
        prompt += `4. WHERE on my farm I should plant them (based on the map you can see)\n`;
        prompt += `5. When to plant them and any guild companions\n`;
      } else {
        prompt += `I currently have ${currentCount} ${vitalLabel}:\n`;
        plantList.forEach(plant => {
          prompt += `- ${plant.common_name} (${plant.scientific_name || 'unknown species'})\n`;
        });
        prompt += `\nPlease recommend:\n`;
        prompt += `1. How many MORE ${vitalLabel} I should add for optimal farm function\n`;
        prompt += `2. Specific additional native species to diversify this function\n`;
        prompt += `3. WHERE on my farm to plant them (considering what I already have)\n`;
        prompt += `4. How to create guilds or polycultures with my existing ${vitalLabel}\n`;
        prompt += `5. Any gaps in coverage I should address\n`;
      }

      prompt += `\nPlease be specific about quantities, locations on the map, and spacing. Focus on native species suitable for my climate zone.`;

      console.log('Vital recommendations prompt:', prompt);

      // Set the prompt and trigger new conversation
      setVitalPrompt(prompt);
      setStartNewChat(true);
      setIsChatOpen(true);

      // Reset flags after component has time to receive them
      setTimeout(() => {
        setVitalPrompt(undefined);
        setStartNewChat(false);
      }, 1000);
    },
    [setIsChatOpen]
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Modern Header - Two-tier design for better hierarchy */}
      <header className="bg-card border-b border-border">
        {/* Top Row: Farm Identity & Primary Actions */}
        <div className="px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            {/* Farm Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground truncate">
                  {farm.name}
                </h1>
                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasUnsavedChanges && !saving && (
                    <span className="hidden sm:inline-flex text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 font-medium">
                      Unsaved
                    </span>
                  )}
                  {saving && (
                    <span className="hidden sm:inline-flex text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-medium animate-pulse">
                      Saving...
                    </span>
                  )}
                </div>
              </div>
              {farm.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {farm.description}
                </p>
              )}
            </div>

            {/* Primary Action: AI Chat Toggle */}
            <Button
              variant={isChatOpen ? "default" : "outline"}
              size="default"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex-shrink-0"
            >
              <MessageSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>
          </div>
        </div>

        {/* Bottom Row: Secondary Actions */}
        {isOwner && (
          <div className="px-4 sm:px-6 pb-3 flex items-center justify-between gap-3">
            {/* Left: Save Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0"
              >
                <SaveIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {saving ? "Saving..." : hasUnsavedChanges ? "Save Now" : "Saved"}
                </span>
              </Button>

              {/* Mobile status indicator */}
              {(hasUnsavedChanges || saving) && (
                <span className="sm:hidden text-xs text-muted-foreground">
                  {saving ? "Saving..." : "Unsaved"}
                </span>
              )}
            </div>

            {/* Right: Farm Management Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGoalsWizard(true)}
                className="hidden md:flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                <span>Goals</span>
                {goals.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {goals.length}
                  </span>
                )}
              </Button>
              <FarmSettingsButton
                farmId={farm.id}
                initialIsPublic={initialIsPublic}
                onDeleteClick={() => setDeleteDialogOpen(true)}
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div
          ref={mapContainerRef}
          className="flex-1 min-h-[400px] md:min-h-0 relative"
        >
          <FarmMap
            farm={farm}
            zones={zones}
            onZonesChange={handleZonesChange}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onMapLayerChange={setCurrentMapLayer}
            onGetRecommendations={handleVitalRecommendations}
          />
        </div>
        <div
          className={`w-full md:w-96 border-t md:border-t-0 md:border-l border-border max-h-[400px] md:max-h-none overflow-y-auto transition-transform duration-300 ease-in-out ${
            isChatOpen
              ? "translate-x-0"
              : "translate-x-full"
          } fixed top-0 right-0 h-full bg-card z-[35]`}
        >
          <EnhancedChatPanel
            farmId={farm.id}
            initialConversationId={initialConversationId}
            initialMessage={vitalPrompt}
            forceNewConversation={startNewChat}
            onClose={() => setIsChatOpen(false)}
            onAnalyze={handleAnalyze}
          />
        </div>
      </div>

      {/* Delete Farm Dialog */}
      <Dialog open={showGoalsWizard} onOpenChange={setShowGoalsWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Set Your Farm Goals</DialogTitle>
          <DialogDescription className="sr-only">
            Define your permaculture goals to get personalized AI recommendations
          </DialogDescription>
          <GoalCaptureWizard
            farmId={farm.id}
            initialGoals={goals}
            onComplete={(newGoals) => {
              setGoals(newGoals);
              setShowGoalsWizard(false);
            }}
            onCancel={() => setShowGoalsWizard(false)}
          />
        </DialogContent>
      </Dialog>
      <DeleteFarmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        farmName={farm.name}
        farmId={farm.id}
        onDeleteSuccess={() => {
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
