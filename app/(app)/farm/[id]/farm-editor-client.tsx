"use client";

import { useState, useRef, useEffect } from "react";
import { FarmMap } from "@/components/map/farm-map";
import { ChatPanel } from "@/components/ai/chat-panel";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { toPng } from 'html-to-image';

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
}

export function FarmEditorClient({ farm, initialZones, isOwner }: FarmEditorClientProps) {
  const [zones, setZones] = useState<any[]>(initialZones);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSave = async (showAlert = true) => {
    if (zones.length === 0) return;

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
    if (zones.length > 0 && hasUnsavedChanges) {
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

  const handleAnalyze = async (query: string): Promise<string> => {
    // Capture screenshot from map container
    if (!mapContainerRef.current || !mapRef.current) {
      throw new Error("Map not ready");
    }

    // Wait for map to be fully loaded and idle
    await new Promise<void>((resolve) => {
      if (mapRef.current!.loaded()) {
        // Add small delay to ensure rendering is complete
        setTimeout(() => resolve(), 100);
      } else {
        mapRef.current!.once('idle', () => {
          setTimeout(() => resolve(), 100);
        });
      }
    });

    let screenshotData: string;
    try {
      // Use html-to-image to capture the entire map element (bypasses CORS issues)
      // Lower quality and resolution to reduce memory pressure
      screenshotData = await toPng(mapContainerRef.current, {
        quality: 0.6, // Reduced from 0.8 to save memory
        pixelRatio: 0.75, // Reduced from 1 to save memory
        skipFonts: true, // Skip font embedding to avoid errors
        cacheBust: true, // Prevent caching issues
      });
    } catch (error) {
      console.error('Screenshot capture error:', error);
      throw new Error('Failed to capture map screenshot. Try again in a moment.');
    }

    // Get AI analysis - send image data, zones, and map layer context
    const analyzeRes = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        query,
        imageData: screenshotData,
        mapLayer: currentMapLayer,
        zones: zones.map(zone => ({
          type: zone.zone_type,
          name: zone.name || (zone.properties ? JSON.parse(zone.properties).name : null) || 'Unlabeled',
        })),
      }),
    });

    if (!analyzeRes.ok) {
      throw new Error("Analysis failed");
    }

    const { response } = await analyzeRes.json();
    return response;
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {farm.name}
            {hasUnsavedChanges && (
              <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {farm.description || "No description"}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            {saving && <span className="text-sm text-muted-foreground">Auto-saving...</span>}
            <Button onClick={() => handleSave(true)} disabled={saving}>
              <SaveIcon className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Now"}
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div ref={mapContainerRef} className="flex-1 min-h-[400px] md:min-h-0">
          <FarmMap
            farm={farm}
            zones={zones}
            onZonesChange={handleZonesChange}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onMapLayerChange={setCurrentMapLayer}
          />
        </div>
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l max-h-[400px] md:max-h-none overflow-y-auto">
          <ChatPanel farmId={farm.id} onAnalyze={handleAnalyze} />
        </div>
      </div>
    </div>
  );
}
