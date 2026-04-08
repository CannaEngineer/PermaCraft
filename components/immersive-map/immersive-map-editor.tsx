"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ImmersiveMapUIProvider, useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { LayerProvider } from "@/contexts/layer-context";
import { ThinHeader } from "./thin-header";
import { DrawingToolbar } from "./drawing-toolbar";
import { BottomDrawer } from "./bottom-drawer";
import { ChatOverlay } from "./chat-overlay";
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
import { FeatureListPanel } from "@/components/map/feature-list-panel";
import { FeatureTouchModal, type TouchFeature } from "@/components/map/feature-touch-modal";
import { InteractionLayerFilter, type InteractionFilter } from "@/components/map/interaction-layer-filter";
import { ManageTab } from "@/components/map/manage-tab";
import { StoryTab } from "@/components/map/story-tab";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JournalEntryForm } from "@/components/farm/journal-entry-form";
import { GPSFieldMarker } from "@/components/map/gps-field-marker";
import type { GPSDropPinFormData } from "@/components/map/gps-drop-pin-form";
import { BoundaryWalker, type BoundaryWalkerResult } from "@/components/map/boundary-walker";
import { SoilTestForm, type SoilTestData } from "@/components/map/soil-test-form";
import { GeotaggedPhotoCapture, type GeotaggedPhotoData } from "@/components/map/geotagged-photo-capture";
import { GPSToolsMenu, type GPSTool } from "@/components/map/gps-tools-menu";
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
  const { toast } = useToast();

  // Get UI context
  const {
    uiMode,
    chatOpen,
    setChatOpen,
    openDrawer,
    closeDrawer,
    drawerContent,
    drawerHeight,
    setDrawerHeight,
    headerCollapsed,
    setHeaderCollapsed,
    drawingMode,
    activeDrawTool,
    exitDrawingMode,
  } = useImmersiveMapUI();

  // Map state
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const [gridUnit] = useState<'imperial' | 'metric'>("imperial");

  // Save state: 'idle' | 'saving' | 'saved' | 'error'
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const savedResetTimer = useRef<NodeJS.Timeout | null>(null);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [journalFormOpen, setJournalFormOpen] = useState(false);

  // Goals state
  const [goals, setGoals] = useState<FarmerGoal[]>([]);

  // Posts state
  const [posts, setPosts] = useState<any[]>([]);
  const fetchPosts = useCallback(() => {
    fetch(`/api/farms/${farm.id}/posts`)
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(err => console.error('Failed to fetch posts:', err));
  }, [farm.id]);

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

  // Time Machine / Story state
  const [projectionYear, setProjectionYear] = useState<number>(new Date().getFullYear());
  const [storyDraftCount, setStoryDraftCount] = useState(0);

  // Selected feature for annotation panel
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    type: 'zone' | 'planting' | 'line' | 'guild' | 'phase';
  } | null>(null);

  // Touch selection modal state
  const [touchFeatures, setTouchFeatures] = useState<TouchFeature[] | null>(null);

  // Interaction layer filter — controls which feature types respond to touch/click
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');

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

  // GPS field mapping state — coordinates to auto-place a planting at GPS location
  const [gpsPlantingCoords, setGpsPlantingCoords] = useState<{ lat: number; lng: number; notes?: string; seq: number } | null>(null);

  // GPS feature states — boundary walking, soil testing, photo geotagging
  const [showBoundaryWalker, setShowBoundaryWalker] = useState(false);
  const [showSoilTestForm, setShowSoilTestForm] = useState(false);
  const [showGeotaggedPhoto, setShowGeotaggedPhoto] = useState(false);
  const [gpsDropPinTrigger, setGpsDropPinTrigger] = useState(0);

  // Track drawer height before GPS form opens so we can restore it
  const preGpsDrawerHeightRef = useRef<'peek' | 'medium' | 'max'>(drawerHeight);

  const handleGPSFormVisibilityChange = useCallback((visible: boolean) => {
    if (visible) {
      preGpsDrawerHeightRef.current = drawerHeight;
      setDrawerHeight('peek');
    } else {
      setDrawerHeight(preGpsDrawerHeightRef.current);
    }
  }, [drawerHeight, setDrawerHeight]);

  // Load all farm data in parallel on mount
  useEffect(() => {
    if (!farm?.id) return;

    const loadAllFarmData = async () => {
      const endpoints = [
        { url: `/api/farms/${farm.id}/goals`, key: 'goals' },
        { url: `/api/farms/${farm.id}/native-species`, key: 'native-species' },
        { url: `/api/farms/${farm.id}/plantings`, key: 'plantings' },
        { url: `/api/farms/${farm.id}/lines`, key: 'lines' },
        { url: `/api/farms/${farm.id}/guilds`, key: 'guilds' },
        { url: `/api/farms/${farm.id}/phases`, key: 'phases' },
      ];

      const results = await Promise.allSettled(
        endpoints.map(ep => fetch(ep.url).then(r => r.json()))
      );

      // Apply results — each settles independently so one failure doesn't block others
      if (results[0].status === 'fulfilled') setGoals(results[0].value.goals || []);
      if (results[1].status === 'fulfilled') setNativeSpecies(results[1].value.perfect_match?.slice(0, 10) || []);
      if (results[2].status === 'fulfilled') setPlantings(results[2].value.plantings || []);
      if (results[3].status === 'fulfilled') setLines(results[3].value.lines || []);
      if (results[4].status === 'fulfilled') setGuilds(results[4].value.guilds || []);
      if (results[5].status === 'fulfilled') setFarmPhases(results[5].value.phases || []);

      // Log any failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Failed to load ${endpoints[i].key}:`, r.reason);
        }
      });
    };

    loadAllFarmData();
  }, [farm?.id]);

  // Individual reload helpers (for refresh after mutations)
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

  // Save zones
  const handleSave = async (isAutoSave = false) => {
    setSaving(true);
    setSaveState('saving');

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
      setSaveState('saved');

      // Reset "saved" indicator after 3 seconds
      if (savedResetTimer.current) clearTimeout(savedResetTimer.current);
      savedResetTimer.current = setTimeout(() => setSaveState('idle'), 3000);

      if (!isAutoSave) {
        toast({ title: "Saved", description: "All changes saved." });
      }
    } catch (error) {
      setSaveState('error');
      console.error(error);
      toast({
        title: "Save failed",
        description: "Changes couldn't be saved. They'll retry automatically.",
        variant: "destructive",
      });
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
        handleSave(true);
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

  // Delete a zone by ID (removes from MapboxDraw via zones state update)
  const handleDeleteZone = useCallback(async (zoneId: string) => {
    try {
      await fetch(`/api/farms/${farm.id}/zones/${zoneId}`, { method: 'DELETE' });
      setZones(prev => prev.filter(z => z.id !== zoneId));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  }, [farm.id]);

  // Delete a line by ID
  const handleDeleteLine = useCallback(async (lineId: string) => {
    try {
      await fetch(`/api/farms/${farm.id}/lines/${lineId}`, { method: 'DELETE' });
      setLines(prev => prev.filter(l => l.id !== lineId));
    } catch (error) {
      console.error('Failed to delete line:', error);
    }
  }, [farm.id]);

  // Delete a planting by ID
  const handleDeletePlanting = useCallback(async (plantingId: string) => {
    try {
      await fetch(`/api/farms/${farm.id}/plantings/${plantingId}`, { method: 'DELETE' });
      setPlantings(prev => prev.filter(p => p.id !== plantingId));
    } catch (error) {
      console.error('Failed to delete planting:', error);
    }
  }, [farm.id]);

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

  // Handle touch/click on map features — shows modal for single or overlapping features
  const handleFeaturesAtPoint = useCallback((features: Array<{
    id: string;
    type: 'zone' | 'planting' | 'line';
    name?: string;
    zoneType?: string;
    plantingData?: any;
    lineData?: any;
  }>) => {
    setTouchFeatures(features as TouchFeature[]);
  }, []);

  // Handle action from the touch modal
  const handleTouchModalAction = useCallback((feature: TouchFeature, action: 'edit' | 'delete' | 'details' | 'comments' | 'companions') => {
    setTouchFeatures(null);

    if (action === 'details') {
      setSelectedFeature({ id: feature.id, type: feature.type });
      openDrawer('details', 'medium');
    } else if (action === 'comments') {
      setSelectedFeature({ id: feature.id, type: feature.type });
      openDrawer('comments', 'medium');
    } else if (action === 'companions') {
      // Open guild designer with the selected planting as focal species
      if (feature.type === 'planting' && feature.plantingData) {
        setGuildContext({
          focalSpecies: {
            id: feature.plantingData.species_id,
            common_name: feature.plantingData.common_name,
            scientific_name: feature.plantingData.scientific_name,
            layer: feature.plantingData.layer,
          },
          farmContext: farmContext,
        });
        openDrawer('guild-designer', 'max');
      }
    } else if (action === 'delete') {
      // Delete the feature
      if (feature.type === 'zone') {
        handleDeleteZone(feature.id);
      } else if (feature.type === 'line') {
        handleDeleteLine(feature.id);
      } else if (feature.type === 'planting') {
        handleDeletePlanting(feature.id);
      }
    }
  }, [openDrawer, farmContext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Escape — always returns to idle/safe state (even from inputs)
      if (e.key === 'Escape') {
        if (drawingMode) {
          exitDrawingMode();
        } else if (chatOpen) {
          setChatOpen(false);
        } else if (drawerContent) {
          closeDrawer();
        }
        return;
      }

      // Don't trigger shortcuts while typing in inputs
      if (isTyping) return;

      // C - Toggle chat
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        setChatOpen(!chatOpen);
      }

      // H - Toggle header
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        setHeaderCollapsed(!headerCollapsed);
      }

      // ? - Show keyboard shortcuts
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        toast({
          title: "Keyboard shortcuts",
          description: "C — AI Chat  |  D — Draw mode  |  Esc — Close  |  H — Toggle header  |  S — Snap to grid",
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen, headerCollapsed, setHeaderCollapsed, drawingMode, exitDrawingMode, drawerContent, closeDrawer, toast]);

  // Keyboard shortcut discovery — show once on first map interaction
  const shortcutHintShown = useRef(false);
  useEffect(() => {
    if (!mapRef.current || shortcutHintShown.current) return;

    const STORAGE_KEY = 'permacraft-shortcut-hint-shown';
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return;

    const showHint = () => {
      if (shortcutHintShown.current) return;
      shortcutHintShown.current = true;

      toast({
        title: "Keyboard shortcuts available",
        description: "Press C for AI chat, Esc to close panels, D to draw. Press ? for all shortcuts.",
      });

      localStorage.setItem(STORAGE_KEY, '1');
    };

    // Show after first meaningful map interaction (drag or zoom)
    const map = mapRef.current;
    map.once('moveend', showHint);

    return () => {
      map.off('moveend', showHint);
    };
  }, [mapRef.current, toast]);

  // MapFAB action handlers
  const handleAddPlant = () => {
    setTriggerSpeciesPicker(true);
  };

  const handleSpeciesPickerOpened = useCallback(() => {
    setTriggerSpeciesPicker(false);
  }, []); // empty deps — only calls a state setter

  // GPS field mapping handlers
  const handleGPSPlantingDrop = useCallback((lat: number, lng: number, notes: string) => {
    // Store the GPS coordinates, then trigger the species picker.
    // Once the user selects a species, FarmMap will auto-place it at these coords.
    setGpsPlantingCoords({ lat, lng, notes, seq: Date.now() });
    setTriggerSpeciesPicker(true);
  }, []);

  const handleGPSMarkerDrop = useCallback(async (data: GPSDropPinFormData) => {
    // For non-planting markers (soil tests, observations, waypoints, etc.),
    // create a zone point feature on the farm.
    try {
      const response = await fetch(`/api/farms/${farm.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zones: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [data.lng, data.lat],
            },
            properties: {
              name: data.notes || `${data.markerType.replace('_', ' ')} marker`,
              zone_type: 'feature',
              marker_type: data.markerType,
              gps_accuracy: data.accuracy,
              gps_altitude: data.altitude,
              dropped_at: new Date().toISOString(),
            },
          }],
        }),
      });

      if (response.ok) {
        // Refresh zones to show the new marker
        const zonesRes = await fetch(`/api/farms/${farm.id}/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          handleZonesChange(zonesData.zones || []);
        }
      }
    } catch (error) {
      console.error('Failed to save GPS marker:', error);
    }
  }, [farm.id, handleZonesChange]);

  const handleGPSPlantingHandled = useCallback(() => {
    setGpsPlantingCoords(null);
  }, []);

  // ─── Boundary Walker handler ─────────────────────────────────────────────
  const handleBoundaryComplete = useCallback(async (result: BoundaryWalkerResult) => {
    // Convert walked points into a closed polygon and save as a zone
    const coordinates = result.points.map(p => [p.lng, p.lat]);
    // Close the polygon by repeating the first point
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    try {
      const response = await fetch(`/api/farms/${farm.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zones: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates],
            },
            properties: {
              name: result.name,
              user_zone_type: result.zoneType,
              walked_boundary: true,
              walk_distance_meters: result.totalDistanceMeters,
              walk_point_count: result.points.length,
              walked_at: new Date().toISOString(),
            },
          }],
        }),
      });

      if (response.ok) {
        // Refresh zones
        const zonesRes = await fetch(`/api/farms/${farm.id}/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          handleZonesChange(zonesData.zones || []);
        }
      }
    } catch (error) {
      console.error('Failed to save walked boundary:', error);
    }
    setShowBoundaryWalker(false);
  }, [farm.id, handleZonesChange]);

  // ─── Soil Test handler ────────────────────────────────────────────────────
  const handleSoilTestSubmit = useCallback(async (data: SoilTestData) => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/soil-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          altitude: data.altitude,
          ph: data.ph,
          texture: data.texture,
          organic_matter: data.organicMatter,
          drainage: data.drainage,
          nitrogen: data.nitrogen,
          phosphorus: data.phosphorus,
          potassium: data.potassium,
          depth_inches: data.depthInches,
          color: data.color,
          moisture: data.moisture,
          notes: data.notes,
          label: data.label,
          tested_at: data.testedAt,
        }),
      });

      if (response.ok) {
        // Refresh zones to show the new soil test marker
        const zonesRes = await fetch(`/api/farms/${farm.id}/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          handleZonesChange(zonesData.zones || []);
        }
      }
    } catch (error) {
      console.error('Failed to save soil test:', error);
    }
    setShowSoilTestForm(false);
  }, [farm.id, handleZonesChange]);

  // ─── Geotagged Photo handler ──────────────────────────────────────────────
  const handleGeotaggedPhotoSubmit = useCallback(async (data: GeotaggedPhotoData) => {
    try {
      const response = await fetch(`/api/farms/${farm.id}/geotagged-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          altitude: data.altitude,
          heading: data.heading,
          image_data: data.imageData,
          caption: data.caption,
          compass_direction: data.compassDirection,
          captured_at: data.capturedAt,
        }),
      });

      if (response.ok) {
        // Refresh zones to show the new photo marker
        const zonesRes = await fetch(`/api/farms/${farm.id}/zones`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          handleZonesChange(zonesData.zones || []);
        }
      }
    } catch (error) {
      console.error('Failed to save geotagged photo:', error);
    }
    setShowGeotaggedPhoto(false);
  }, [farm.id, handleZonesChange]);

  // ─── GPS Tools Menu handler ────────────────────────────────────────────────
  const activeGPSTool: GPSTool | null = showBoundaryWalker
    ? 'walk-boundary'
    : showSoilTestForm
    ? 'soil-test'
    : showGeotaggedPhoto
    ? 'photo'
    : null;

  const handleGPSToolSelect = useCallback((tool: GPSTool) => {
    // Reset all GPS tool states first
    setShowBoundaryWalker(false);
    setShowSoilTestForm(false);
    setShowGeotaggedPhoto(false);

    switch (tool) {
      case 'drop-pin':
        // Trigger the GPSFieldMarker capture directly
        setGpsDropPinTrigger(prev => prev + 1);
        break;
      case 'walk-boundary':
        setShowBoundaryWalker(true);
        break;
      case 'soil-test':
        setShowSoilTestForm(true);
        break;
      case 'photo':
        setShowGeotaggedPhoto(true);
        break;
    }
  }, []);

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

  const handleOpenJournalEntry = useCallback(() => {
    setJournalFormOpen(true);
  }, []);

  const handleOpenFarmInfo = useCallback(() => {
    openDrawer('details', 'medium');
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
      <div ref={mapContainerRef} className="absolute inset-0">
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
          onFeaturesAtPoint={handleFeaturesAtPoint}
          interactionFilter={interactionFilter}
          externalDrawingMode={drawingMode}
          externalDrawTool={activeDrawTool}
          externalZoneType={currentZoneType}
          externalSelectedSpecies={pendingPlantSpecies}
          externalShowSpeciesPicker={triggerSpeciesPicker}
          onSpeciesPickerOpened={handleSpeciesPickerOpened}
          onDrawComplete={() => { /* Stay in drawing mode — user clicks Done to exit */ }}
          hideStatusBar
          externalCurrentYear={projectionYear}
          externalOnYearChange={setProjectionYear}
          externalGPSPlantingCoords={gpsPlantingCoords}
          onGPSPlantingHandled={handleGPSPlantingHandled}
        />
      </div>

      {/* Thin Header — persistent bar with farm name, back, overflow menu */}
      {uiMode !== 'drawing' && (
        <ThinHeader
          farmName={farm.name}
          farmId={farm.id}
          onExport={handleOpenExport}
          plantings={plantings}
          currentYear={projectionYear}
          onYearChange={setProjectionYear}
          saveState={saveState}
        />
      )}

      {/* Drawing Toolbar (only during drawing mode) */}
      <DrawingToolbar
        onToolSelect={(tool) => console.log("Tool selected:", tool)}
        onZoneTypeClick={() => {}}
        currentZoneType={currentZoneType}
        onZoneTypeChange={setCurrentZoneType}
      />

      {/* Interaction Layer Filter — lets users select which feature types respond to touch */}
      {uiMode !== 'drawing' && uiMode !== 'chatting' && (
        <div className="absolute left-3 z-30" style={{ bottom: '72px' }}>
          <InteractionLayerFilter
            activeFilter={interactionFilter}
            onFilterChange={setInteractionFilter}
            counts={{
              zones: zones.length,
              plants: plantings.length,
              lines: lines.length,
            }}
          />
        </div>
      )}

      {/* GPS Tools Menu — expandable FAB for all GPS field tools */}
      {isOwner && uiMode !== 'drawing' && uiMode !== 'chatting' && (
        <GPSToolsMenu
          activeTool={activeGPSTool}
          onSelectTool={handleGPSToolSelect}
        />
      )}

      {/* GPS Field Marker — drop pin at GPS location (FAB hidden; triggered via GPS tools menu) */}
      {isOwner && uiMode !== 'drawing' && uiMode !== 'chatting' && !showBoundaryWalker && !showSoilTestForm && !showGeotaggedPhoto && (
        <GPSFieldMarker
          mapRef={mapRef}
          farmCenter={{ lat: farm.center_lat, lng: farm.center_lng }}
          onPlantingDrop={handleGPSPlantingDrop}
          onMarkerDrop={handleGPSMarkerDrop}
          visible={false}
          triggerCapture={gpsDropPinTrigger}
          onFormVisibilityChange={handleGPSFormVisibilityChange}
        />
      )}

      {/* Walking Zone Boundaries — continuous GPS tracking to record a path as a polygon */}
      {isOwner && uiMode !== 'chatting' && (
        <BoundaryWalker
          mapRef={mapRef}
          farmId={farm.id}
          onComplete={handleBoundaryComplete}
          onCancel={() => setShowBoundaryWalker(false)}
          visible={showBoundaryWalker}
        />
      )}

      {/* Soil Test Location Mapping — structured soil data with GPS pin */}
      {isOwner && uiMode !== 'chatting' && (
        <SoilTestForm
          mapRef={mapRef}
          farmCenter={{ lat: farm.center_lat, lng: farm.center_lng }}
          onSubmit={handleSoilTestSubmit}
          onCancel={() => setShowSoilTestForm(false)}
          visible={showSoilTestForm}
        />
      )}

      {/* Photo Geotagging — capture photo with automatic GPS coordinates */}
      {isOwner && uiMode !== 'chatting' && (
        <GeotaggedPhotoCapture
          mapRef={mapRef}
          farmCenter={{ lat: farm.center_lat, lng: farm.center_lng }}
          farmId={farm.id}
          onSubmit={handleGeotaggedPhotoSubmit}
          onCancel={() => setShowGeotaggedPhoto(false)}
          visible={showGeotaggedPhoto}
        />
      )}

      {/* Bottom Drawer (3-tab: Design / Manage / Story) */}
      <BottomDrawer
        onAddPlant={handleAddPlant}
        onDrawZone={() => {/* Drawing handled by enterDrawingMode in the drawer */}}
        onGPSDropPin={() => handleGPSToolSelect('drop-pin')}
        onGPSSoilTest={() => handleGPSToolSelect('soil-test')}
        onGPSPhoto={() => handleGPSToolSelect('photo')}
        onGPSWalkBoundary={() => handleGPSToolSelect('walk-boundary')}
        plantingCount={plantings.length}
        zoneCount={zones.length}
        storyDraftCount={storyDraftCount}
        designContent={
          <FeatureListPanel
            zones={zones}
            plantings={plantings}
            lines={lines}
            guilds={guilds}
            phases={farmPhases}
            onFeatureSelect={handleFeatureSelect}
            mapRef={mapRef}
          />
        }
        manageContent={
          <ManageTab
            farmId={farm.id}
            zones={zones}
            plantings={plantings}
            phases={farmPhases}
            mapRef={mapRef}
          />
        }
        storyContent={
          <StoryTab
            farmId={farm.id}
            onDraftCountChange={setStoryDraftCount}
          />
        }
        detailContent={
          drawerContent === 'details' && selectedFeature && (selectedFeature.type === 'zone' || selectedFeature.type === 'planting' || selectedFeature.type === 'line') ? (
            <AnnotationPanel
              farmId={farm.id}
              featureId={selectedFeature.id}
              featureType={selectedFeature.type}
              onClose={() => { closeDrawer(); setSelectedFeature(null); }}
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
                onSaved={() => {
                  fetch(`/api/farms/${farm.id}/guilds`).then(r => r.json()).then(d => setGuilds(d.guilds || []));
                }}
              />
            ) : (
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold">Choose a focal plant for your guild</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A guild is designed around a central plant. Select one from your farm below, or tap a plant on the map first.
                  </p>
                </div>
                {plantings.length > 0 ? (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {Array.from(new Map(plantings.map(p => [p.species_id || p.common_name, p])).values()).map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setGuildContext({
                            focalSpecies: {
                              id: p.species_id,
                              common_name: p.common_name,
                              scientific_name: p.scientific_name,
                              layer: p.layer,
                              native_region: p.native_region,
                            },
                            farmContext: farmContext,
                          });
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                          <Leaf className="h-4 w-4 text-green-700 dark:text-green-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.common_name}</p>
                          <p className="text-xs text-muted-foreground italic truncate">{p.scientific_name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize flex-shrink-0">{p.layer}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No plants on this farm yet. Add plants first, then build guilds around them.
                  </p>
                )}
              </div>
            )
          ) : drawerContent === 'phase-manager' ? (
            <PhaseManager farmId={farm.id} onSaved={() => {
              fetch(`/api/farms/${farm.id}/phases`).then(r => r.json()).then(d => setFarmPhases(d.phases || []));
            }} />
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
          ) : null
        }
      />

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

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        farmId={farm.id}
        onPostCreated={() => {
          setPostDialogOpen(false);
          fetchPosts();
        }}
      />

      {/* Photo Upload Dialog */}
      <PhotoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        farmId={farm.id}
        onPhotoUploaded={() => {
          setUploadDialogOpen(false);
          fetchPosts();
        }}
      />

      {/* Journal Entry Form */}
      <JournalEntryForm
        open={journalFormOpen}
        onOpenChange={setJournalFormOpen}
        farmId={farm.id}
        onEntryCreated={() => {
          setJournalFormOpen(false);
        }}
      />

      {/* Feature Touch Selection Modal */}
      {touchFeatures && touchFeatures.length > 0 && (
        <FeatureTouchModal
          features={touchFeatures}
          onSelect={handleTouchModalAction}
          onClose={() => setTouchFeatures(null)}
        />
      )}
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
