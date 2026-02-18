"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ImmersiveMapUIProvider, useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { LayerProvider } from "@/contexts/layer-context";
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
import { SpeciesPickerPanel } from "@/components/map/species-picker-panel";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Farm, Zone, FarmerGoal, Species } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { toPng } from "html-to-image";
import { analyzeWithOptimization } from "@/lib/ai/optimized-analyze";

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
  isShopEnabled?: number;
}

function ImmersiveMapEditorContent({
  farm,
  initialZones,
  isOwner,
  initialIsPublic,
  isShopEnabled,
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

  /**
   * Handle AI recommendations for specific vital categories.
   * Builds a contextual prompt and opens the chat overlay with it.
   */
  const handleVitalRecommendations = useCallback(
    (vitalKey: string, vitalLabel: string, currentCount: number, plantList: any[]) => {
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
        plantList.forEach((plant: any) => {
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

      setVitalPrompt(prompt);
      setStartNewChat(true);
      setChatOpen(true);

      setTimeout(() => {
        setVitalPrompt(undefined);
        setStartNewChat(false);
      }, 1000);
    },
    [setChatOpen]
  );

  // Map refs
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Native species and plantings for AI context
  const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [farmPhases, setFarmPhases] = useState<any[]>([]);

  // Zone type for drawing
  const [currentZoneType, setCurrentZoneType] = useState<string>("other");

  // Selected feature for annotation panel
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    type: 'zone' | 'planting' | 'line' | 'guild' | 'phase';
  } | null>(null);

  // Visible layer IDs for filtering
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>([]);

  // Guild context for GuildDesigner
  const [guildContext, setGuildContext] = useState<{
    focalSpecies: any;
    farmContext: { climate_zone: string; soil_type?: string; rainfall_inches?: number };
  } | null>(null);

  // Species selected from the picker, passed to FarmMap to enter planting mode
  const [pendingPlantSpecies, setPendingPlantSpecies] = useState<{ species: Species; seq: number } | null>(null);

  // Triggers FarmMap's internal species picker (same flow as map submenu "Add Plant")
  const [triggerSpeciesPicker, setTriggerSpeciesPicker] = useState(false);

  // Load goals, species, plantings on mount
  useEffect(() => {
    if (farm?.id) {
      loadGoals();
      loadNativeSpecies();
      loadPlantings();
      loadLines();
      loadGuilds();
      loadPhases();
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

  const loadLines = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/lines`);
      const data = await response.json();
      setLines(data.lines || []);
    } catch (error) {
      console.error('Failed to load lines:', error);
    }
  };

  const loadGuilds = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/guilds`);
      const data = await response.json();
      setGuilds(data.guilds || []);
    } catch (error) {
      console.error('Failed to load guilds:', error);
    }
  };

  const loadPhases = async () => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/phases`);
      const data = await response.json();
      setFarmPhases(data.phases || []);
    } catch (error) {
      console.error('Failed to load phases:', error);
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

  // AI analyze handler (optimized)
  const handleAnalyze = useCallback(
    async (query: string, conversationId?: string) => {
      if (!mapContainerRef.current || !mapRef.current) {
        throw new Error("Map not ready");
      }

      try {
        // Capture screenshot
        const screenshot = await captureMapScreenshot();

        // Use optimized analysis
        const result = await analyzeWithOptimization({
          userQuery: query,
          screenshotDataURL: screenshot,
          farmContext: {
            zones,
            plantings,
            lines,
            goals,
            nativeSpecies
          },
          farmInfo: {
            id: farm.id,
            climate_zone: farm.climate_zone,
            rainfall_inches: farm.rainfall_inches,
            soil_type: farm.soil_type
          }
        });

        // Log metadata
        console.log('Analysis complete:', result.metadata);

        // Show toast (metadata display - simplified for now)
        if (result.metadata.cached) {
          console.log(`[Cached] Saved ${result.metadata.totalTokens} tokens`);
        } else {
          console.log(`[New] ${result.metadata.screenshotSize} bytes, ${result.metadata.totalTokens} tokens`);
        }

        return {
          response: result.response,
          conversationId: conversationId || 'new',
          analysisId: 'new',
          screenshot: screenshot,
          generatedImageUrl: undefined
        };
      } catch (error) {
        console.error('Analysis failed:', error);
        throw error;
      }
    },
    [farm.id, farm.climate_zone, farm.rainfall_inches, farm.soil_type, zones, plantings, lines, goals, nativeSpecies, captureMapScreenshot]
  );

  // Farm context for GuildDesigner
  const farmContext = useMemo(() => ({
    climate_zone: farm.climate_zone || '',
    soil_type: farm.soil_type ?? undefined,
    rainfall_inches: farm.rainfall_inches ?? undefined
  }), [farm]);

  // Handle feature selection for annotation panel
  const handleFeatureSelect = useCallback((featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase', featureData?: any) => {
    setSelectedFeature({ id: featureId, type: featureType });

    // If it's a planting, store it for guild building
    if (featureType === 'planting' && featureData) {
      setGuildContext({
        focalSpecies: featureData,
        farmContext: farmContext
      });
    }

    openDrawer('details', 'medium');
  }, [openDrawer, farmContext]);

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

  const handleAddPlant = () => {
    setTriggerSpeciesPicker(true);
  };

  const handleSpeciesPickerOpened = useCallback(() => {
    setTriggerSpeciesPicker(false);
  }, []); // empty deps — only calls a state setter

  const handleSelectSpecies = (species: Species) => {
    // Close the drawer
    closeDrawer();

    // Store the selected species so FarmMap can enter planting mode.
    // Increment seq so re-selecting the same species still triggers the useEffect.
    setPendingPlantSpecies(prev => ({ species, seq: (prev?.seq ?? 0) + 1 }));
  };

  const handleOpenWaterSystem = useCallback(() => {
    openDrawer('water-system', 'max');
  }, [openDrawer]);

  const handleOpenGuildDesigner = useCallback(() => {
    // If no focal species selected yet, ensure context exists but with null species
    // (the drawer will show a message to select a plant)
    if (!guildContext || !guildContext.focalSpecies) {
      setGuildContext({
        focalSpecies: null,
        farmContext: farmContext
      });
    }
    openDrawer('guild-designer', 'max');
  }, [openDrawer, farmContext, guildContext]);

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
          onGetRecommendations={handleVitalRecommendations}
          onFeatureSelect={handleFeatureSelect}
          externalDrawingMode={drawingMode}
          externalDrawTool={activeDrawTool}
          externalSelectedSpecies={pendingPlantSpecies}
          externalShowSpeciesPicker={triggerSpeciesPicker}
          onSpeciesPickerOpened={handleSpeciesPickerOpened}
        />
      </div>

      {/* Collapsible Header */}
      <CollapsibleHeader
        farm={farm}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        goalsCount={goals.length}
        isPublic={initialIsPublic}
        isShopEnabled={isShopEnabled}
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
        {drawerContent === 'details' && selectedFeature && (selectedFeature.type === 'zone' || selectedFeature.type === 'planting' || selectedFeature.type === 'line') ? (
          <AnnotationPanel
            farmId={farm.id}
            featureId={selectedFeature.id}
            featureType={selectedFeature.type}
            onClose={() => {
              closeDrawer();
              setSelectedFeature(null);
            }}
          />
        ) : drawerContent === 'comments' && selectedFeature && (selectedFeature.type === 'zone' || selectedFeature.type === 'planting' || selectedFeature.type === 'line') ? (
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
        ) : drawerContent === 'species-picker' ? (
          <SpeciesPickerPanel
            farmId={farm.id}
            onSelectSpecies={handleSelectSpecies}
            onClose={closeDrawer}
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
        onAddPlant={handleAddPlant}
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
      <LayerProvider farmId={props.farm.id}>
        <ImmersiveMapEditorContent {...props} />
      </LayerProvider>
    </ImmersiveMapUIProvider>
  );
}
