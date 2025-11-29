"use client";

import { useState, useRef } from "react";
import { FarmMap } from "@/components/map/farm-map";
import { ChatPanel } from "@/components/ai/chat-panel";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
}

export function FarmEditorClient({ farm, initialZones, isOwner }: FarmEditorClientProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const handleSave = async () => {
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

      alert("Zones saved successfully!");
    } catch (error) {
      alert("Failed to save zones");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (query: string): Promise<string> => {
    // Capture screenshot from map
    if (!mapRef.current) {
      throw new Error("Map not ready");
    }

    const canvas = mapRef.current.getCanvas();
    const screenshotData = canvas.toDataURL('image/png');

    // Upload screenshot
    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        imageData: screenshotData,
        snapshotType: "design",
      }),
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload screenshot");
    }

    const { url } = await uploadRes.json();

    // Get AI analysis
    const analyzeRes = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        query,
        screenshotUrl: url,
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
          <h1 className="text-xl font-bold">{farm.name}</h1>
          <p className="text-sm text-muted-foreground">
            {farm.description || "No description"}
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleSave} disabled={saving}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      <div className="flex-1 flex">
        <div className="flex-1">
          <FarmMap
            farm={farm}
            zones={initialZones}
            onZonesChange={setZones}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
          />
        </div>
        <div className="w-96 border-l">
          <ChatPanel farmId={farm.id} onAnalyze={handleAnalyze} />
        </div>
      </div>
    </div>
  );
}
