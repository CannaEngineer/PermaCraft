'use client';

import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ImmersiveMapUIProvider, useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';
import { LayerProvider } from '@/contexts/layer-context';
import { useUnifiedCanvas, type CanvasSection } from '@/contexts/unified-canvas-context';
import { CommandBar } from './command-bar';
import { NavRail } from './nav-rail';
import { ContextPanel } from './context-panel';
import { CanvasMobileNav } from './canvas-mobile-nav';
import { FarmMap } from '@/components/map/farm-map';
import { DrawingToolbar } from '@/components/immersive-map/drawing-toolbar';
import { BottomDrawer } from '@/components/immersive-map/bottom-drawer';
import { ChatOverlay } from '@/components/immersive-map/chat-overlay';
import { MapFAB } from '@/components/immersive-map/map-fab';
import { AnnotationPanel } from '@/components/annotations/annotation-panel';
import { CommentThread } from '@/components/comments/comment-thread';
import { WaterSystemPanel } from '@/components/water/water-system-panel';
import { GuildDesigner } from '@/components/guilds/guild-designer';
import { PhaseManager } from '@/components/phasing/phase-manager';
import { ExportPanel } from '@/components/export/export-panel';
import { SpeciesPickerPanel } from '@/components/map/species-picker-panel';
import { GoalCaptureWizard } from '@/components/farm/goal-capture-wizard';
import { CreatePostDialog } from '@/components/farm/create-post-dialog';
import { PhotoUploadDialog } from '@/components/immersive-map/photo-upload-dialog';
import { DeleteFarmDialog } from '@/components/shared/delete-farm-dialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, Leaf, MapPin, Globe, Sprout, GraduationCap } from 'lucide-react';
import { WelcomeWalkthrough } from './welcome-walkthrough';
import { toPng } from 'html-to-image';
import { analyzeWithOptimization } from '@/lib/ai/optimized-analyze';
import type { Farm, Zone, FarmerGoal, Species } from '@/lib/db/schema';
import type maplibregl from 'maplibre-gl';

// Lazy-loaded section panels
const DashboardPanel = lazy(() => import('./panels/dashboard-panel').then(m => ({ default: m.DashboardPanel })));
const FarmPanel = lazy(() => import('./panels/farm-panel').then(m => ({ default: m.FarmPanel })));
const ExplorePanel = lazy(() => import('./panels/explore-panel').then(m => ({ default: m.ExplorePanel })));
const PlantsPanel = lazy(() => import('./panels/plants-panel').then(m => ({ default: m.PlantsPanel })));
const LearnPanel = lazy(() => import('./panels/learn-panel').then(m => ({ default: m.LearnPanel })));

function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

interface UnifiedCanvasProps {
  userId: string;
  userName: string | null;
}

export function UnifiedCanvas({ userId, userName }: UnifiedCanvasProps) {
  const { activeFarm, activeFarmId } = useUnifiedCanvas();

  if (!activeFarm) {
    return <UnifiedCanvasEmpty userId={userId} userName={userName} />;
  }

  return (
    <ImmersiveMapUIProvider>
      <LayerProvider key={activeFarm.id} farmId={activeFarm.id}>
        <UnifiedCanvasContent
          userId={userId}
          userName={userName}
          farm={activeFarm}
        />
      </LayerProvider>
    </ImmersiveMapUIProvider>
  );
}

function UnifiedCanvasEmpty({ userId, userName }: { userId: string; userName: string | null }) {
  const { setActiveSection } = useUnifiedCanvas();
  const [showWalkthrough, setShowWalkthrough] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('onboarding-complete') !== 'true'; } catch { return false; }
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <CommandBar userId={userId} userName={userName} />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />

        {showWalkthrough ? (
          <WelcomeWalkthrough
            userName={userName}
            onComplete={() => setShowWalkthrough(false)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Start your permaculture journey</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a farm to begin designing, or explore what the community has built.
                </p>
              </div>
              <a
                href="/farm/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <MapPin className="h-4 w-4" />
                Create Your First Farm
              </a>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => setActiveSection('explore')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent/40 hover:bg-accent/60 transition-colors"
                >
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span className="text-xs font-medium">Explore</span>
                </button>
                <button
                  onClick={() => setActiveSection('plants')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent/40 hover:bg-accent/60 transition-colors"
                >
                  <Sprout className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-medium">Plants</span>
                </button>
                <button
                  onClick={() => setActiveSection('learn')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-accent/40 hover:bg-accent/60 transition-colors"
                >
                  <GraduationCap className="h-5 w-5 text-purple-500" />
                  <span className="text-xs font-medium">Learn</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <CanvasMobileNav />
    </div>
  );
}

interface UnifiedCanvasContentProps {
  userId: string;
  userName: string | null;
  farm: Farm;
}

function UnifiedCanvasContent({ userId, userName, farm }: UnifiedCanvasContentProps) {
  const router = useRouter();
  const { activeSection, setActiveSection, mapRef } = useUnifiedCanvas();
  const {
    chatOpen, setChatOpen,
    openDrawer, closeDrawer, drawerContent,
    drawingMode, activeDrawTool,
  } = useImmersiveMapUI();

  // Map state
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>('satellite');

  // Save state
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Farm data
  const [goals, setGoals] = useState<FarmerGoal[]>([]);
  const [nativeSpecies, setNativeSpecies] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [farmPhases, setFarmPhases] = useState<any[]>([]);
  const [currentZoneType, setCurrentZoneType] = useState<string>('other');

  // Feature selection
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    type: 'zone' | 'planting' | 'line' | 'guild' | 'phase';
  } | null>(null);
  const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>([]);
  const [guildContext, setGuildContext] = useState<{
    focalSpecies: any;
    farmContext: { climate_zone: string; soil_type?: string; rainfall_inches?: number };
  } | null>(null);

  // Species picker bridge
  const [pendingPlantSpecies, setPendingPlantSpecies] = useState<{ species: Species; seq: number } | null>(null);
  const [triggerSpeciesPicker, setTriggerSpeciesPicker] = useState(false);

  // Chat state
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>();
  const [vitalPrompt, setVitalPrompt] = useState<string | undefined>();
  const [startNewChat, setStartNewChat] = useState(false);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Farm context for GuildDesigner
  const farmContext = useMemo(() => ({
    climate_zone: farm.climate_zone || '',
    soil_type: farm.soil_type ?? undefined,
    rainfall_inches: farm.rainfall_inches ?? undefined,
  }), [farm]);

  // Load farm data on mount / farm change
  useEffect(() => {
    if (!farm?.id) return;

    const loadAll = async () => {
      const fetches = [
        fetch(`/api/farms/${farm.id}/zones`).then(r => r.json()).then(d => setZones(d.zones || [])),
        fetch(`/api/farms/${farm.id}/goals`).then(r => r.json()).then(d => setGoals(d.goals || [])),
        fetch(`/api/farms/${farm.id}/native-species`).then(r => r.json()).then(d => setNativeSpecies(d.perfect_match?.slice(0, 10) || [])),
        fetch(`/api/farms/${farm.id}/plantings`).then(r => r.json()).then(d => setPlantings(d.plantings || [])),
        fetch(`/api/farms/${farm.id}/lines`).then(r => r.json()).then(d => setLines(d.lines || [])),
        fetch(`/api/farms/${farm.id}/guilds`).then(r => r.json()).then(d => setGuilds(d.guilds || [])),
        fetch(`/api/farms/${farm.id}/phases`).then(r => r.json()).then(d => setFarmPhases(d.phases || [])),
      ];
      await Promise.allSettled(fetches);
    };

    loadAll();
  }, [farm?.id]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setSaveToast({ message, type });
    setTimeout(() => setSaveToast(null), 3000);
  }, []);

  const handleSave = useCallback(async (showFeedback = true) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones }),
      });
      if (!res.ok) throw new Error('Failed to save zones');
      setHasUnsavedChanges(false);
      if (showFeedback) showToast('Zones saved', 'success');
    } catch (error) {
      if (showFeedback) showToast('Failed to save zones', 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }, [farm.id, zones, showToast]);

  // Auto-save zones
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleSave(false), 2000);
    }
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [zones, hasUnsavedChanges, handleSave]);

  const handleZonesChange = (newZones: Zone[]) => {
    setZones(newZones);
    setHasUnsavedChanges(true);
  };

  // Feature selection
  const handleFeatureSelect = useCallback((featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase', featureData?: any) => {
    setSelectedFeature({ id: featureId, type: featureType });
    if (featureType === 'planting' && featureData) {
      setGuildContext({ focalSpecies: featureData, farmContext });
    }
    openDrawer('details', 'medium');
  }, [openDrawer, farmContext]);

  // Vital recommendations
  const handleVitalRecommendations = useCallback(
    (vitalKey: string, vitalLabel: string, currentCount: number, plantList: any[]) => {
      let prompt = `I'd like recommendations for ${vitalLabel} on my farm.\n\n`;
      if (currentCount === 0) {
        prompt += `I currently have NO ${vitalLabel} planted. Please recommend specific native species, quantities, locations on my map, and spacing.`;
      } else {
        prompt += `I have ${currentCount} ${vitalLabel}:\n`;
        plantList.forEach((p: any) => { prompt += `- ${p.common_name} (${p.scientific_name || 'unknown'})\n`; });
        prompt += `\nPlease recommend additional species and locations to improve this function.`;
      }
      setVitalPrompt(prompt);
      setStartNewChat(true);
      setChatOpen(true);
      setTimeout(() => { setVitalPrompt(undefined); setStartNewChat(false); }, 1000);
    },
    [setChatOpen]
  );

  // Screenshot capture
  const captureMapScreenshot = useCallback(async (): Promise<string> => {
    if (!mapContainerRef.current || !mapRef.current) throw new Error('Map not ready');

    await new Promise<void>((resolve) => {
      let idleCount = 0;
      const checkReady = () => {
        if (mapRef.current!.loaded() && !mapRef.current!.isMoving()) {
          idleCount++;
          if (idleCount >= 3) setTimeout(() => resolve(), 500);
          else setTimeout(checkReady, 200);
        } else {
          idleCount = 0;
          mapRef.current!.once('idle', checkReady);
        }
      };
      checkReady();
      setTimeout(() => resolve(), 10000);
    });

    const canvas = mapRef.current.getCanvas();
    const captureCanvasOnRender = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        let captured = false;
        const handler = () => {
          if (captured) return;
          captured = true;
          try {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            if (dataUrl.length < 50000) reject(new Error('Canvas is blank'));
            else resolve(dataUrl);
          } catch (e) { reject(e); }
        };
        mapRef.current!.once('render', handler);
        mapRef.current!.triggerRepaint();
        setTimeout(() => { if (!captured) { captured = true; reject(new Error('Timeout')); } }, 3000);
      });
    };

    const canvasDataUrl = await captureCanvasOnRender();
    const tempImg = document.createElement('img');
    tempImg.src = canvasDataUrl;
    tempImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0';
    tempImg.className = 'temp-screenshot-canvas';
    await new Promise(r => { tempImg.onload = r; tempImg.onerror = r; });

    const mapCanvas = mapContainerRef.current.querySelector('canvas');
    if (mapCanvas?.parentElement) {
      mapCanvas.parentElement.insertBefore(tempImg, mapCanvas);
      (mapCanvas as HTMLElement).style.opacity = '0';
    }

    try {
      const screenshotData = await toPng(mapContainerRef.current, {
        quality: 0.9, pixelRatio: 1, cacheBust: false, skipFonts: true,
        filter: (node) => {
          if (node.classList?.contains('temp-screenshot-canvas')) return true;
          if (node.classList?.contains('maplibregl-ctrl')) return false;
          if (node.classList?.contains('mapboxgl-ctrl')) return false;
          if ((node as HTMLElement).hasAttribute?.('data-bottom-drawer')) return false;
          return true;
        },
      });
      return screenshotData;
    } finally {
      tempImg.remove();
      if (mapCanvas) (mapCanvas as HTMLElement).style.opacity = '1';
    }
  }, [mapRef]);

  // AI analyze handler
  const handleAnalyze = useCallback(
    async (query: string, conversationId?: string) => {
      const screenshot = await captureMapScreenshot();
      const result = await analyzeWithOptimization({
        userQuery: query,
        screenshotDataURL: screenshot,
        farmContext: { zones, plantings, lines, goals, nativeSpecies },
        farmInfo: {
          id: farm.id,
          climate_zone: farm.climate_zone,
          rainfall_inches: farm.rainfall_inches,
          soil_type: farm.soil_type,
        },
      });
      return {
        response: result.response,
        conversationId: conversationId || 'new',
        analysisId: 'new',
        screenshot,
        generatedImageUrl: undefined,
      };
    },
    [farm, zones, plantings, lines, goals, nativeSpecies, captureMapScreenshot]
  );

  // MapFAB handlers
  const handleAddPlant = () => setTriggerSpeciesPicker(true);
  const handleSpeciesPickerOpened = useCallback(() => setTriggerSpeciesPicker(false), []);
  const handleSelectSpecies = (species: Species) => {
    closeDrawer();
    setPendingPlantSpecies(prev => ({ species, seq: (prev?.seq ?? 0) + 1 }));
  };
  const handleOpenWaterSystem = useCallback(() => openDrawer('water-system', 'max'), [openDrawer]);
  const handleOpenGuildDesigner = useCallback(() => {
    if (!guildContext?.focalSpecies) setGuildContext({ focalSpecies: null, farmContext });
    openDrawer('guild-designer', 'max');
  }, [openDrawer, farmContext, guildContext]);
  const handleOpenPhaseManager = useCallback(() => openDrawer('phase-manager', 'max'), [openDrawer]);
  const handleOpenExport = useCallback(() => openDrawer('export', 'max'), [openDrawer]);

  // Drawer opener for FarmPanel
  const handleOpenDrawer = useCallback((content: string) => {
    openDrawer(content as any, 'max');
  }, [openDrawer]);

  // Filtered zones by visible layers
  const filteredZones = useMemo(() => {
    if (visibleLayerIds.length === 0) return zones;
    return zones.filter(zone => {
      let layerIds: string[] = [];
      if (zone.layer_ids) {
        try { layerIds = JSON.parse(zone.layer_ids as any); } catch { /* malformed data */ }
      }
      if (!Array.isArray(layerIds) || layerIds.length === 0) return true;
      return layerIds.some((id: string) => visibleLayerIds.includes(id));
    });
  }, [zones, visibleLayerIds]);

  // Keyboard shortcuts for section switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const sectionMap: Record<string, CanvasSection> = {
        '1': 'home', '2': 'farm', '3': 'explore', '4': 'plants', '5': 'learn',
      };

      if (sectionMap[e.key]) {
        e.preventDefault();
        setActiveSection(sectionMap[e.key]);
      }

      if (e.key === '6' || e.key === 'c') {
        setChatOpen(!chatOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveSection, setChatOpen, chatOpen]);

  // Render the active panel content (non-farm sections only — farm uses ContextPanel directly)
  const renderPanelContent = () => {
    switch (activeSection) {
      case 'home':
        return <DashboardPanel />;
      case 'explore':
        return <ExplorePanel />;
      case 'plants':
        return <PlantsPanel />;
      case 'learn':
        return <LearnPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Command Bar */}
      <CommandBar
        userId={userId}
        userName={userName}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Nav Rail (desktop) */}
        <NavRail />

        {/* Map Canvas (always rendered underneath) */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0">
            <FarmMap
              farm={farm}
              zones={filteredZones}
              onZonesChange={handleZonesChange}
              onMapReady={(map) => { mapRef.current = map; }}
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

          {/* Farm mode overlays */}
          {activeSection === 'farm' && (
            <>
              <DrawingToolbar
                onToolSelect={(tool) => console.log('Tool:', tool)}
                onZoneTypeClick={() => console.log('Zone type')}
                currentZoneType={currentZoneType}
              />
              <MapFAB
                onAddPlant={handleAddPlant}
                onWaterSystem={handleOpenWaterSystem}
                onBuildGuild={handleOpenGuildDesigner}
                onTimeline={handleOpenPhaseManager}
              />
            </>
          )}

          {/* Non-farm/non-AI: full-width panel covering map */}
          {activeSection !== 'farm' && activeSection !== 'ai' && (
            <div className="absolute inset-0 z-10 bg-background flex justify-center overflow-y-auto">
              <div className="w-full max-w-2xl h-full">
                <Suspense fallback={<PanelLoadingFallback />}>
                  {renderPanelContent()}
                </Suspense>
              </div>
            </div>
          )}
        </div>

        {/* Context Panel — farm section only */}
        {activeSection === 'farm' && (
          <ContextPanel>
            <Suspense fallback={<PanelLoadingFallback />}>
              <FarmPanel onOpenDrawer={handleOpenDrawer} />
            </Suspense>
          </ContextPanel>
        )}
      </div>

      {/* Bottom Drawer (for farm tools) */}
      <BottomDrawer>
        {drawerContent === 'details' && selectedFeature && (selectedFeature.type === 'zone' || selectedFeature.type === 'planting' || selectedFeature.type === 'line') ? (
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
          guildContext?.focalSpecies ? (
            <GuildDesigner
              farmId={farm.id}
              focalSpecies={guildContext.focalSpecies}
              farmContext={guildContext.farmContext}
            />
          ) : (
            <div className="p-6 space-y-4">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold">Choose a focal plant for your guild</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a plant from your farm or tap one on the map.
                </p>
              </div>
              {plantings.length > 0 && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {Array.from(new Map(plantings.map(p => [p.species_id || p.common_name, p])).values()).map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setGuildContext({
                        focalSpecies: { id: p.species_id, common_name: p.common_name, scientific_name: p.scientific_name, layer: p.layer, native_region: p.native_region },
                        farmContext,
                      })}
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
              )}
            </div>
          )
        ) : drawerContent === 'phase-manager' ? (
          <PhaseManager farmId={farm.id} />
        ) : drawerContent === 'export' ? (
          <ExportPanel farmId={farm.id} farmName={farm.name} mapInstance={mapRef.current} />
        ) : drawerContent === 'species-picker' ? (
          <SpeciesPickerPanel farmId={farm.id} onSelectSpecies={handleSelectSpecies} onClose={closeDrawer} />
        ) : (
          <div className="p-4 text-muted-foreground">
            {drawerContent ? 'Loading...' : 'Select a feature or use the action menu'}
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
            Define your permaculture goals
          </DialogDescription>
          <GoalCaptureWizard
            farmId={farm.id}
            initialGoals={goals}
            onComplete={(newGoals) => { setGoals(newGoals); setShowGoalsWizard(false); }}
            onCancel={() => setShowGoalsWizard(false)}
          />
        </DialogContent>
      </Dialog>

      <DeleteFarmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        farmName={farm.name}
        farmId={farm.id}
        onDeleteSuccess={() => router.push('/dashboard')}
      />

      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        farmId={farm.id}
        onPostCreated={() => setPostDialogOpen(false)}
      />

      <PhotoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        farmId={farm.id}
        onPhotoUploaded={() => setUploadDialogOpen(false)}
      />

      {/* Save toast notification */}
      {saveToast && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-sm transition-all ${
          saveToast.type === 'success'
            ? 'bg-green-600/90 text-white'
            : 'bg-destructive/90 text-destructive-foreground'
        }`}>
          {saveToast.message}
        </div>
      )}

      {/* Mobile bottom nav */}
      <CanvasMobileNav />
    </div>
  );
}
