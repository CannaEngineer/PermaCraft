"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Droplets, Waves, BarChart3, Plus, ChevronLeft } from "lucide-react";
import { SwaleDesigner } from "./swale-designer";
import { CatchmentCalculator } from "./catchment-calculator";

interface WaterSystemPanelProps {
  farmId: string;
}

interface ZoneOption {
  id: string;
  name: string | null;
  zone_type: string;
}

interface CatchmentZone {
  id: string;
  name: string | null;
  properties: any;
  catchment_properties: any;
}

interface SwaleZone {
  id: string;
  name: string | null;
  properties: any;
  swale_properties: any;
}

interface WaterSystemStats {
  totalCatchmentGallons: number;
  totalSwaleCapacityGallons: number;
  catchmentCount: number;
  swaleCount: number;
}

type ConfigureMode = null | "pick-zone" | "catchment" | "swale";

export function WaterSystemPanel({ farmId }: WaterSystemPanelProps) {
  const [catchments, setCatchments] = useState<CatchmentZone[]>([]);
  const [swales, setSwales] = useState<SwaleZone[]>([]);
  const [allZones, setAllZones] = useState<ZoneOption[]>([]);
  const [stats, setStats] = useState<WaterSystemStats>({
    totalCatchmentGallons: 0,
    totalSwaleCapacityGallons: 0,
    catchmentCount: 0,
    swaleCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Configure mode state
  const [configureMode, setConfigureMode] = useState<ConfigureMode>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneName, setSelectedZoneName] = useState<string>("");

  const loadWaterFeatures = useCallback(async () => {
    try {
      const zonesResponse = await fetch(`/api/farms/${farmId}/zones`).catch(() => ({ ok: false as const }));

      if (!zonesResponse.ok || !('json' in zonesResponse)) {
        setLoading(false);
        return;
      }

      const zonesData = await zonesResponse.json();
      const zones = Array.isArray(zonesData) ? zonesData : (zonesData.zones || []);

      // Store all zones for the zone picker
      setAllZones(zones.map((z: any) => ({ id: z.id, name: z.name, zone_type: z.zone_type })));

      // Parse zones with water properties
      const catchmentZones: CatchmentZone[] = [];
      const swaleZones: SwaleZone[] = [];

      zones.forEach((zone: any) => {
        if (zone.catchment_properties) {
          try {
            const catchmentProps = typeof zone.catchment_properties === 'string'
              ? JSON.parse(zone.catchment_properties)
              : zone.catchment_properties;

            if (catchmentProps.is_catchment) {
              catchmentZones.push({
                id: zone.id,
                name: zone.name,
                properties: zone.properties ? JSON.parse(zone.properties) : {},
                catchment_properties: catchmentProps
              });
            }
          } catch (e) {
            console.error("Failed to parse catchment properties:", e);
          }
        }

        if (zone.swale_properties) {
          try {
            const swaleProps = typeof zone.swale_properties === 'string'
              ? JSON.parse(zone.swale_properties)
              : zone.swale_properties;

            if (swaleProps.is_swale) {
              swaleZones.push({
                id: zone.id,
                name: zone.name,
                properties: zone.properties ? JSON.parse(zone.properties) : {},
                swale_properties: swaleProps
              });
            }
          } catch (e) {
            console.error("Failed to parse swale properties:", e);
          }
        }
      });

      setCatchments(catchmentZones);
      setSwales(swaleZones);

      const totalCatchmentGallons = catchmentZones.reduce(
        (sum, c) => sum + (c.catchment_properties.estimated_capture_gallons || 0),
        0
      );

      const totalSwaleCapacityGallons = swaleZones.reduce(
        (sum, s) => sum + (s.swale_properties.estimated_volume_gallons || 0),
        0
      );

      setStats({
        totalCatchmentGallons,
        totalSwaleCapacityGallons,
        catchmentCount: catchmentZones.length,
        swaleCount: swaleZones.length
      });
    } catch (error) {
      console.error("Error loading water features:", error);
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    loadWaterFeatures();
  }, [loadWaterFeatures]);

  const formatNumber = (num: number) => Math.round(num).toLocaleString();

  const handleCalculated = () => {
    // Refresh data after a calculation saves to the DB
    setConfigureMode(null);
    setSelectedZoneId(null);
    loadWaterFeatures();
  };

  const handlePickZone = (zoneId: string, zoneName: string, mode: "catchment" | "swale") => {
    setSelectedZoneId(zoneId);
    setSelectedZoneName(zoneName);
    setConfigureMode(mode);
  };

  // Configure mode: show zone picker or calculator
  if (configureMode === "pick-zone") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfigureMode(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-base">Select a Zone</CardTitle>
              <CardDescription>Choose a zone to configure water properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {allZones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No zones found. Draw a zone on the map first.
            </p>
          ) : (
            allZones.map((zone) => {
              const isCatchment = catchments.some(c => c.id === zone.id);
              const isSwale = swales.some(s => s.id === zone.id);
              const label = zone.name || zone.zone_type.replace(/_/g, " ");
              return (
                <div key={zone.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium capitalize">{label}</p>
                      {(isCatchment || isSwale) && (
                        <div className="flex gap-1 mt-0.5">
                          {isCatchment && <Badge variant="outline" className="text-xs">Catchment</Badge>}
                          {isSwale && <Badge variant="outline" className="text-xs">Swale</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handlePickZone(zone.id, label, "catchment")}
                    >
                      <Droplets className="h-3 w-3 mr-1" />
                      {isCatchment ? "Recalculate" : "Add"} Catchment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handlePickZone(zone.id, label, "swale")}
                    >
                      <Waves className="h-3 w-3 mr-1" />
                      {isSwale ? "Recalculate" : "Add"} Swale
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  if (configureMode === "catchment" && selectedZoneId) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setConfigureMode("pick-zone")}>
          <ChevronLeft className="h-4 w-4" />
          Back to zones
        </Button>
        <CatchmentCalculator
          farmId={farmId}
          zoneId={selectedZoneId}
          zoneName={selectedZoneName}
          onCalculated={handleCalculated}
        />
      </div>
    );
  }

  if (configureMode === "swale" && selectedZoneId) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setConfigureMode("pick-zone")}>
          <ChevronLeft className="h-4 w-4" />
          Back to zones
        </Button>
        <SwaleDesigner
          farmId={farmId}
          zoneId={selectedZoneId}
          zoneName={selectedZoneName}
          onCalculated={handleCalculated}
        />
      </div>
    );
  }

  // Default: overview with tabs
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Water System
        </CardTitle>
        <CardDescription>
          Catchment areas, swales, and water storage capacity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading water system data...</div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">
                <BarChart3 className="h-4 w-4 mr-1" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="catchments">
                <Droplets className="h-4 w-4 mr-1" />
                Catchments
              </TabsTrigger>
              <TabsTrigger value="swales">
                <Waves className="h-4 w-4 mr-1" />
                Swales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Annual Capture</span>
                  <span className="font-semibold text-blue-600">
                    {formatNumber(stats.totalCatchmentGallons)} gal/year
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Swale Capacity</span>
                  <span className="font-semibold text-blue-600">
                    {formatNumber(stats.totalSwaleCapacityGallons)} gal
                  </span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Catchment Areas</span>
                    <Badge variant="default">{stats.catchmentCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Swales</span>
                    <Badge variant="secondary">{stats.swaleCount}</Badge>
                  </div>
                </div>
              </div>

              {stats.catchmentCount === 0 && stats.swaleCount === 0 && (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No water features configured yet.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigureMode("pick-zone")}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Water Feature
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="catchments" className="space-y-3">
              {catchments.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No catchment areas configured.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigureMode("pick-zone")}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Catchment
                  </Button>
                </div>
              ) : (
                <>
                  {catchments.map((catchment) => (
                    <div key={catchment.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {catchment.name || "Unnamed catchment"}
                        </span>
                        <Badge variant="outline">
                          {catchment.catchment_properties.rainfall_inches_per_year} in/year
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual capture:</span>
                          <span className="font-medium text-blue-600">
                            {formatNumber(catchment.catchment_properties.estimated_capture_gallons)} gal
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Daily average:</span>
                          <span className="font-medium">
                            {formatNumber(catchment.catchment_properties.estimated_capture_gallons / 365)} gal
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfigureMode("pick-zone")}
                    className="w-full gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add another catchment
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="swales" className="space-y-3">
              {swales.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No swales configured.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigureMode("pick-zone")}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Swale
                  </Button>
                </div>
              ) : (
                <>
                  {swales.map((swale) => (
                    <div key={swale.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {swale.name || "Unnamed swale"}
                        </span>
                        <Badge variant="outline">
                          {swale.swale_properties.length_feet} ft
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions:</span>
                          <span className="font-medium">
                            {swale.swale_properties.cross_section_width_feet}ft × {swale.swale_properties.cross_section_depth_feet}ft
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-medium text-blue-600">
                            {formatNumber(swale.swale_properties.estimated_volume_gallons)} gal
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfigureMode("pick-zone")}
                    className="w-full gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add another swale
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
