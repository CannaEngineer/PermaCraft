"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Minus } from "lucide-react";
import type { Zone, Line } from "@/lib/db/schema";

interface WaterConnectionPickerProps {
  farmId: string;
  onConnectionChange?: (sourceId: string | null, destinationId: string | null) => void;
  defaultSourceId?: string;
  defaultDestinationId?: string;
}

interface WaterFeature {
  id: string;
  name: string;
  type: "zone" | "line";
  featureType: string;
}

export function WaterConnectionPicker({
  farmId,
  onConnectionChange,
  defaultSourceId,
  defaultDestinationId
}: WaterConnectionPickerProps) {
  const [sourceId, setSourceId] = useState<string | null>(defaultSourceId || null);
  const [destinationId, setDestinationId] = useState<string | null>(defaultDestinationId || null);
  const [features, setFeatures] = useState<WaterFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaterFeatures();
  }, [farmId]);

  const loadWaterFeatures = async () => {
    try {
      const [zonesResponse, linesResponse] = await Promise.all([
        fetch(`/api/farms/${farmId}/zones`).catch(() => ({ ok: false })),
        fetch(`/api/farms/${farmId}/lines`).catch(() => ({ ok: false }))
      ]);

      const waterFeatures: WaterFeature[] = [];

      // Load zones if endpoint exists
      if (zonesResponse.ok) {
        try {
          const zonesData = await zonesResponse.json();
          const zones = Array.isArray(zonesData) ? zonesData : [];
          zones.forEach((zone: any) => {
            const properties = zone.properties ? JSON.parse(zone.properties) : {};
            const userZoneType = properties.user_zone_type || zone.zone_type;

            // Only include water-related zones
            if (['pond', 'swale', 'water_body', 'water_flow', 'catchment'].includes(userZoneType)) {
              waterFeatures.push({
                id: zone.id,
                name: zone.name || `${userZoneType} zone`,
                type: "zone",
                featureType: userZoneType
              });
            }
          });
        } catch (e) {
          console.error("Failed to parse zones:", e);
        }
      }

      // Load lines
      if (linesResponse.ok) {
        try {
          const linesData = await linesResponse.json();
          const lines = Array.isArray(linesData) ? linesData : [];
          lines.forEach((line: any) => {
            // Only include water-related lines
            if (['swale', 'flow_path', 'contour'].includes(line.line_type)) {
              waterFeatures.push({
                id: line.id,
                name: line.label || `${line.line_type}`,
                type: "line",
                featureType: line.line_type
              });
            }
          });
        } catch (e) {
          console.error("Failed to parse lines:", e);
        }
      }

      setFeatures(waterFeatures);
    } catch (error) {
      console.error("Error loading water features:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (value: string) => {
    const newSourceId = value === "none" ? null : value;
    setSourceId(newSourceId);
    onConnectionChange?.(newSourceId, destinationId);
  };

  const handleDestinationChange = (value: string) => {
    const newDestinationId = value === "none" ? null : value;
    setDestinationId(newDestinationId);
    onConnectionChange?.(sourceId, newDestinationId);
  };

  const getFeatureBadgeVariant = (type: string) => {
    return type === "zone" ? "default" : "secondary";
  };

  const renderFeatureOption = (feature: WaterFeature) => (
    <div className="flex items-center gap-2">
      <Badge variant={getFeatureBadgeVariant(feature.type)} className="text-xs">
        {feature.type === "zone" ? <MapPin className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      </Badge>
      <span>{feature.name}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-blue-500" />
          Water Connections
        </CardTitle>
        <CardDescription>
          Link water features to show flow relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading water features...</div>
        ) : features.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No water features found. Draw ponds, swales, or flow paths to connect them.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="source">Source (where water comes from)</Label>
              <Select value={sourceId || "none"} onValueChange={handleSourceChange}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination (where water flows to)</Label>
              <Select value={destinationId || "none"} onValueChange={handleDestinationChange}>
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Select destination feature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-xs h-5">
                  <MapPin className="h-3 w-3" />
                </Badge>
                <span>Zone (polygon)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs h-5">
                  <Minus className="h-3 w-3" />
                </Badge>
                <span>Line (path)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
