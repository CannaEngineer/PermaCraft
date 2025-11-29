"use client";

import { useState } from "react";
import { FarmMap } from "@/components/map/farm-map";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
}

export function FarmEditorClient({ farm, initialZones }: FarmEditorClientProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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

      // Success feedback
      alert("Zones saved successfully!");
    } catch (error) {
      alert("Failed to save zones");
      console.error(error);
    } finally {
      setSaving(false);
    }
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
        <Button onClick={handleSave} disabled={saving}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="flex-1">
        <FarmMap farm={farm} zones={initialZones} onZonesChange={setZones} />
      </div>
    </div>
  );
}
