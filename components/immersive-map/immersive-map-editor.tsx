"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImmersiveMapUIProvider, useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { CollapsibleHeader } from "./collapsible-header";
import { MapControlPanel } from "./map-control-panel";
import { DrawingToolbar } from "./drawing-toolbar";
import { BottomDrawer } from "./bottom-drawer";
import { ChatOverlay } from "./chat-overlay";
import { FarmMap } from "@/components/map/farm-map";
import { DeleteFarmDialog } from "@/components/shared/delete-farm-dialog";
import { GoalCaptureWizard } from "@/components/farm/goal-capture-wizard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Farm, Zone, FarmerGoal } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { toPng } from "html-to-image";

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
  const { setChatOpen, openDrawer, setHeaderCollapsed } = useImmersiveMapUI();

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

  // AI screenshot capture (placeholder for now - will implement in next task)
  const captureMapScreenshot = useCallback(async (): Promise<string> => {
    // TODO: Implement screenshot capture (copy from FarmEditorClient)
    console.log("Screenshot capture not yet implemented");
    return "";
  }, []);

  // AI analyze handler (placeholder for now - will implement in next task)
  const handleAnalyze = useCallback(
    async (query: string, conversationId?: string) => {
      // TODO: Implement AI analysis (copy from FarmEditorClient)
      console.log("AI analysis not yet implemented");
      return {
        response: "Not implemented",
        conversationId: "",
        analysisId: "",
        screenshot: "",
      };
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // C - Toggle chat
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setChatOpen((prev) => !prev);
      }

      // H - Toggle header
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setHeaderCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setChatOpen, setHeaderCollapsed]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Map Layer (full viewport) */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0">
        <FarmMap
          farm={farm}
          zones={zones}
          onZonesChange={handleZonesChange}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          onMapLayerChange={setCurrentMapLayer}
          onGetRecommendations={() => {}}
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
      />

      {/* Map Control Panel */}
      <MapControlPanel
        currentLayer={currentMapLayer}
        onLayerChange={setCurrentMapLayer}
        gridUnit={gridUnit}
        onGridUnitChange={setGridUnit}
        gridDensity={gridDensity}
        onGridDensityChange={setGridDensity}
        terrainEnabled={terrainEnabled}
        onTerrainToggle={() => setTerrainEnabled(!terrainEnabled)}
      />

      {/* Drawing Toolbar (conditional) */}
      <DrawingToolbar
        onToolSelect={(tool) => console.log("Tool selected:", tool)}
        onZoneTypeClick={() => console.log("Zone type click")}
        currentZoneType={currentZoneType}
      />

      {/* Bottom Drawer */}
      <BottomDrawer>
        <div>Drawer content goes here</div>
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
