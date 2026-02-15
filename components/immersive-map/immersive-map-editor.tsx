"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ImmersiveMapUIProvider, useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { CollapsibleHeader } from "./collapsible-header";
import { DrawingToolbar } from "./drawing-toolbar";
import { BottomDrawer } from "./bottom-drawer";
import { ChatOverlay } from "./chat-overlay";
import { MapFAB } from "./map-fab";
import { FarmMap } from "@/components/map/farm-map";
import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { CommentThread } from "@/components/comments/comment-thread";
import { DeleteFarmDialog } from "@/components/shared/delete-farm-dialog";
import { GoalCaptureWizard } from "@/components/farm/goal-capture-wizard";
import { CreatePostDialog } from "@/components/farm/create-post-dialog";
import { PhotoUploadDialog } from "./photo-upload-dialog";
import { WaterSystemPanel } from "@/components/water/water-system-panel";
import { GuildDesigner } from "@/components/guilds/guild-designer";
import { PhaseManager } from "@/components/phasing/phase-manager";
import { ExportPanel } from "@/components/export/export-panel";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Farm, Zone, FarmerGoal } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { toPng } from "html-to-image";

/**
 * Build legend context text for AI
 */
const buildLegendContext = (currentMapLayer: string, zones: Zone[]) => {
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
};

const buildNativeSpeciesContext = (nativeSpecies: any[]) => {
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
};

const buildPlantingsContext = (plantings: any[]) => {
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
};

const buildGoalsContext = (goals: FarmerGoal[]) => {
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
};

interface ImmersiveMapEditorProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
  initialIsPublic: boolean;
}

function ImmersiveMapEditorContent({
  farm,
  initialZones,
  isOwner,
  initialIsPublic,
}: ImmersiveMapEditorProps) {
  const router = useRouter();

  // Get UI context
  const {
    chatOpen,
    setChatOpen,
    openDrawer,
    closeDrawer,
    drawerContent,
    headerCollapsed,
    setHeaderCollapsed,
    drawingMode,
    activeDrawTool,
  } = useImmersiveMapUI();

  // Map state
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const [gridUnit, setGridUnit] = useState<'imperial' | 'metric'>("imperial");
  const [gridDensity, setGridDensity] = useState<string>("auto");
  const [terrainEnabled, setTerrainEnabled] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Goals state
  const [goals, setGoals] = useState<FarmerGoal[]>([]);

  // Chat state
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [vitalPrompt, setVitalPrompt] = useState<string | undefined>(undefined);
  const [startNewChat, setStartNewChat] = useState(false);

  // Map refs
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Native species and plantings for AI context
  const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);

  // Zone type for drawing
  const [currentZoneType, setCurrentZoneType] = useState<string>("other");

  // Selected feature for annotation panel
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    type: 'zone' | 'planting' | 'line';
  } | null>(null);

  // Visible layer IDs for filtering
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>([]);

  // Guild context for GuildDesigner
  const [guildContext, setGuildContext] = useState<{
    focalSpecies: any;
    farmContext: { climate_zone: string; soil_type?: string; rainfall_inches?: number };
  } | null>(null);

  // Load goals, species, plantings on mount
  useEffect(() => {
    if (farm?.id) {
      loadGoals();
      loadNativeSpecies();
      loadPlantings();
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

  // Save zones
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
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

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

  // Handle zones change
  const handleZonesChange = (newZones: Zone[]) => {
    setZones(newZones);
    setHasUnsavedChanges(true);
  };

  // AI screenshot capture
  const captureMapScreenshot = useCallback(async (): Promise<string> => {
    if (!mapContainerRef.current || !mapRef.current) {
      throw new Error("Map not ready");
    }

    // Wait for map to be fully loaded
    await new Promise<void>((resolve) => {
      let idleCount = 0;

      const checkReady = () => {
        const style = mapRef.current!.getStyle();
        const sourcesLoaded = Object.keys(style.sources).every(sourceId => {
          const source = mapRef.current!.getSource(sourceId);
          return !source || !(source as any)._tiles || Object.keys((source as any)._tiles).length === 0 ||
                 Object.values((source as any)._tiles).every((tile: any) => tile.state === 'loaded');
        });

        if (sourcesLoaded && mapRef.current!.loaded() && !mapRef.current!.isMoving()) {
          idleCount++;
          if (idleCount >= 3) {
            setTimeout(() => resolve(), 500);
          } else {
            setTimeout(checkReady, 200);
          }
        } else {
          idleCount = 0;
          mapRef.current!.once("idle", checkReady);
        }
      };

      checkReady();

      setTimeout(() => resolve(), 10000);
    });

    const canvas = mapRef.current.getCanvas();

    const captureCanvasOnRender = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        let captured = false;

        const captureHandler = () => {
          if (captured) return;
          captured = true;

          try {
            const dataUrl = canvas.toDataURL("image/png", 1.0);
            if (dataUrl.length < 50000) {
              reject(new Error("Canvas is blank"));
            } else {
              resolve(dataUrl);
            }
          } catch (error) {
            reject(error);
          }
        };

        mapRef.current!.once('render', captureHandler);
        mapRef.current!.triggerRepaint();

        setTimeout(() => {
          if (!captured) {
            captured = true;
            reject(new Error("Screenshot capture timed out"));
          }
        }, 3000);
      });
    };

    const canvasDataUrl = await captureCanvasOnRender();

    const tempImg = document.createElement('img');
    tempImg.src = canvasDataUrl;
    tempImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0';
    tempImg.className = 'temp-screenshot-canvas';

    await new Promise((resolve) => {
      tempImg.onload = resolve;
      tempImg.onerror = resolve;
    });

    const mapCanvas = mapContainerRef.current.querySelector('canvas');
    if (mapCanvas && mapCanvas.parentElement) {
      mapCanvas.parentElement.insertBefore(tempImg, mapCanvas);
      (mapCanvas as HTMLElement).style.opacity = '0';
    }

    const screenshotData = await toPng(mapContainerRef.current, {
      quality: 0.9,
      pixelRatio: 1,
      cacheBust: false,
      skipFonts: true,
      filter: (node) => {
        if (node.classList) {
          if (node.classList.contains('temp-screenshot-canvas')) return true;
          if (node.classList.contains('maplibregl-ctrl')) return false;
          if (node.classList.contains('mapboxgl-ctrl')) return false;
        }
        if ((node as HTMLElement).hasAttribute?.('data-bottom-drawer')) {
          return false;
        }
        return true;
      },
    });

    tempImg.remove();
    if (mapCanvas) {
      (mapCanvas as HTMLElement).style.opacity = '1';
    }

    if (!screenshotData || screenshotData === "data:,") {
      throw new Error("Screenshot is empty");
    }

    const base64Length = screenshotData.replace(/^data:image\/\w+;base64,/, "").length;
    if (base64Length < 1000) {
      throw new Error("Screenshot appears to be blank.");
    }

    return screenshotData;
  }, [mapContainerRef, mapRef]);

  // AI analyze handler
  const handleAnalyze = useCallback(
    async (query: string, conversationId?: string) => {
      if (!mapContainerRef.current || !mapRef.current) {
        throw new Error("Map not ready");
      }

      const currentLayerScreenshot = await captureMapScreenshot();

      const originalLayer = currentMapLayer;
      const isTopoLayer = originalLayer === "usgs" || originalLayer === "topo" || originalLayer === "terrain";
      const secondLayer = isTopoLayer ? "satellite" : "usgs";

      let secondScreenshot: string;

      const currentStyle = mapRef.current.getStyle();

      let secondStyle;
      if (isTopoLayer) {
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

      mapRef.current.setStyle(secondStyle);

      await new Promise<void>((resolve) => {
        const onStyleData = () => {
          mapRef.current!.once("idle", () => {
            setTimeout(() => resolve(), 1000);
          });
        };

        if (mapRef.current!.isStyleLoaded()) {
          onStyleData();
        } else {
          mapRef.current!.once("styledata", onStyleData);
        }

        setTimeout(() => resolve(), 15000);
      });

      secondScreenshot = await captureMapScreenshot();

      mapRef.current.setStyle(currentStyle);

      await new Promise<void>((resolve) => {
        mapRef.current!.once("styledata", () => {
          mapRef.current!.once("idle", () => {
            setTimeout(() => resolve(), 500);
          });
        });
        setTimeout(() => resolve(), 10000);
      });

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
          legendContext: buildLegendContext(currentMapLayer, zones),
          nativeSpeciesContext: buildNativeSpeciesContext(nativeSpecies),
          plantingsContext: buildPlantingsContext(plantings),
          goalsContext: buildGoalsContext(goals),
          zones: zones.map((zone) => {
            const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
            return {
              type: zone.zone_type,
              name: zone.name || "Unlabeled",
              geometryType: geom.type,
            };
          }),
        }),
      });

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.message || errorData.error || "Analysis failed";
        throw new Error(errorMessage);
      }

      const data = await analyzeRes.json();
      return {
        response: data.response,
        conversationId: data.conversationId,
        analysisId: data.analysisId,
        screenshot: currentLayerScreenshot,
        generatedImageUrl: data.generatedImageUrl,
      };
    },
    [farm.id, currentMapLayer, zones, mapContainerRef, mapRef, captureMapScreenshot, nativeSpecies, plantings, goals]
  );

  // Handle feature selection for annotation panel
  const handleFeatureSelect = useCallback((featureId: string, featureType: 'zone' | 'planting' | 'line') => {
    setSelectedFeature({ id: featureId, type: featureType });
    openDrawer('details', 'medium');
  }, [openDrawer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // C - Toggle chat
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setChatOpen(!chatOpen);
      }

      // H - Toggle header
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setHeaderCollapsed(!headerCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen, headerCollapsed, setHeaderCollapsed]);

  // Farm context for GuildDesigner
  const farmContext = useMemo(() => ({
    climate_zone: farm.climate_zone || '',
    soil_type: farm.soil_type ?? undefined,
    rainfall_inches: farm.rainfall_inches ?? undefined
  }), [farm]);

  // MapFAB action handlers
  const handleCreatePost = () => {
    setPostDialogOpen(true);
  };

  const handleUploadPhoto = () => {
    setUploadDialogOpen(true);
  };

  const handleDropPin = () => {
    openDrawer('species-picker', 'medium');
  };

  const handleOpenWaterSystem = useCallback(() => {
    openDrawer('water-system', 'max');
  }, [openDrawer]);

  const handleOpenGuildDesigner = useCallback(() => {
    // TODO: Implement species picker first, then transition to guild designer
    // For now, open with placeholder context
    setGuildContext({
      focalSpecies: null,
      farmContext: farmContext
    });
    openDrawer('guild-designer', 'max');
  }, [openDrawer, farmContext]);

  const handleOpenPhaseManager = useCallback(() => {
    openDrawer('phase-manager', 'max');
  }, [openDrawer]);

  const handleOpenExport = useCallback(() => {
    openDrawer('export', 'max');
  }, [openDrawer]);

  // Filter zones by visible layers
  const filteredZones = useMemo(() => {
    if (visibleLayerIds.length === 0) {
      // No layer filtering - show all zones
      return zones;
    }

    return zones.filter(zone => {
      // Parse layer_ids from zone
      const layerIds = zone.layer_ids
        ? JSON.parse(zone.layer_ids as any)
        : [];

      // Show zones with no layers assigned
      if (layerIds.length === 0) {
        return true;
      }

      // Show zones that belong to at least one visible layer
      return layerIds.some((layerId: string) => visibleLayerIds.includes(layerId));
    });
  }, [zones, visibleLayerIds]);

  // Handler for layer visibility changes
  const handleLayerVisibilityChange = useCallback((layerIds: string[]) => {
    setVisibleLayerIds(layerIds);
  }, []);

  return (
    <div className="fixed inset-0 bottom-16 md:bottom-0 md:left-64 overflow-hidden bg-background">
      {/* Map Layer (full viewport) */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0">
        <FarmMap
          farm={farm}
          zones={filteredZones}
          onZonesChange={handleZonesChange}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          onMapLayerChange={setCurrentMapLayer}
          onGetRecommendations={() => {}}
          externalDrawingMode={drawingMode}
          externalDrawTool={activeDrawTool}
        />
      </div>

      {/* Collapsible Header */}
      <CollapsibleHeader
        farm={farm}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        goalsCount={goals.length}
        isPublic={initialIsPublic}
        onSave={() => handleSave(true)}
        onOpenChat={() => setChatOpen(true)}
        onOpenGoals={() => setShowGoalsWizard(true)}
        onDeleteClick={() => setDeleteDialogOpen(true)}
        onExport={handleOpenExport}
      />

      {/* Drawing Toolbar (conditional) */}
      <DrawingToolbar
        onToolSelect={(tool) => console.log("Tool selected:", tool)}
        onZoneTypeClick={() => console.log("Zone type click")}
        currentZoneType={currentZoneType}
      />

      {/* Bottom Drawer */}
      <BottomDrawer>
        {drawerContent === 'details' && selectedFeature ? (
          <AnnotationPanel
            farmId={farm.id}
            featureId={selectedFeature.id}
            featureType={selectedFeature.type}
            onClose={() => {
              closeDrawer();
              setSelectedFeature(null);
            }}
          />
        ) : drawerContent === 'comments' && selectedFeature ? (
          <CommentThread
            farmId={farm.id}
            currentUserId={farm.user_id}
            featureId={selectedFeature.id}
            featureType={selectedFeature.type}
          />
        ) : drawerContent === 'water-system' ? (
          <WaterSystemPanel farmId={farm.id} />
        ) : drawerContent === 'guild-designer' ? (
          guildContext && guildContext.focalSpecies ? (
            <GuildDesigner
              farmId={farm.id}
              focalSpecies={guildContext.focalSpecies}
              farmContext={guildContext.farmContext}
            />
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="font-semibold">Select a focal species first</p>
                <p className="text-sm mt-2">
                  A guild is designed around a central "focal" plant. Please select a species from the map or species list to build a guild around it.
                </p>
              </div>
            </div>
          )
        ) : drawerContent === 'phase-manager' ? (
          <PhaseManager farmId={farm.id} />
        ) : drawerContent === 'export' ? (
          <ExportPanel
            farmId={farm.id}
            farmName={farm.name}
            mapInstance={mapRef.current}
          />
        ) : (
          <div className="p-4 text-muted-foreground">
            {drawerContent ? 'Panel loading...' : 'Select a feature or use the action menu'}
          </div>
        )}
      </BottomDrawer>

      {/* Chat Overlay */}
      <ChatOverlay
        farmId={farm.id}
        onAnalyze={handleAnalyze}
        initialConversationId={initialConversationId}
        initialMessage={vitalPrompt}
        forceNewConversation={startNewChat}
      />

      {/* Dialogs */}
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

      {/* Map FAB */}
      <MapFAB
        onCreatePost={handleCreatePost}
        onUploadPhoto={handleUploadPhoto}
        onDropPin={handleDropPin}
        onWaterSystem={handleOpenWaterSystem}
        onBuildGuild={handleOpenGuildDesigner}
        onTimeline={handleOpenPhaseManager}
      />

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        farmId={farm.id}
        onPostCreated={() => {
          setPostDialogOpen(false);
          // TODO: Refresh posts feed if needed
        }}
      />

      {/* Photo Upload Dialog */}
      <PhotoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        farmId={farm.id}
        onPhotoUploaded={() => {
          setUploadDialogOpen(false);
          // TODO: Refresh posts feed if needed
        }}
      />
    </div>
  );
}

export function ImmersiveMapEditor(props: ImmersiveMapEditorProps) {
  return (
    <ImmersiveMapUIProvider>
      <ImmersiveMapEditorContent {...props} />
    </ImmersiveMapUIProvider>
  );
}
