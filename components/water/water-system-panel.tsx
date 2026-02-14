"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Droplets, Waves, BarChart3 } from "lucide-react";

interface WaterSystemPanelProps {
  farmId: string;
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

export function WaterSystemPanel({ farmId }: WaterSystemPanelProps) {
  const [catchments, setCatchments] = useState<CatchmentZone[]>([]);
  const [swales, setSwales] = useState<SwaleZone[]>([]);
  const [stats, setStats] = useState<WaterSystemStats>({
    totalCatchmentGallons: 0,
    totalSwaleCapacityGallons: 0,
    catchmentCount: 0,
    swaleCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaterFeatures();
  }, [farmId]);

  const loadWaterFeatures = async () => {
    try {
      // Load zones - try both with and without GET endpoint
      const zonesResponse = await fetch(`/api/farms/${farmId}/zones`).catch(() => ({ ok: false as false }));

      if (!zonesResponse.ok || !('json' in zonesResponse)) {
        setLoading(false);
        return;
      }

      const zonesData = await zonesResponse.json();
      const zones = Array.isArray(zonesData) ? zonesData : [];

      // Parse zones with water properties
      const catchmentZones: CatchmentZone[] = [];
      const swaleZones: SwaleZone[] = [];

      zones.forEach((zone: any) => {
        // Parse catchment properties
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

        // Parse swale properties
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

      // Calculate stats
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
  };

  const formatNumber = (num: number) => Math.round(num).toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Water System Overview
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
                <div className="text-sm text-muted-foreground text-center py-4">
                  No water features configured yet. Use the catchment calculator or swale designer to get started.
                </div>
              )}
            </TabsContent>

            <TabsContent value="catchments" className="space-y-3">
              {catchments.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No catchment areas configured. Draw a zone and use the catchment calculator.
                </div>
              ) : (
                catchments.map((catchment) => (
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
                ))
              )}
            </TabsContent>

            <TabsContent value="swales" className="space-y-3">
              {swales.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No swales configured. Draw a line or zone and use the swale designer.
                </div>
              ) : (
                swales.map((swale) => (
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
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
