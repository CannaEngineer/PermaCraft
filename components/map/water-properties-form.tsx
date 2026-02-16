'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Droplets, Calculator, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Zone, Line, WaterProperties, CatchmentProperties, SwaleProperties } from '@/lib/db/schema';
import {
  calculateCatchmentCapture,
  calculateSwaleCapacity,
  calculateAreaFromGeometry,
  calculateLengthFromGeometry
} from '@/lib/water/calculations';

interface WaterPropertiesFormProps {
  feature: Zone | Line;
  featureType: 'zone' | 'line';
  onSave: (properties: any) => Promise<void>;
  onClose: () => void;
}

export function WaterPropertiesForm({
  feature,
  featureType,
  onSave,
  onClose
}: WaterPropertiesFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Determine feature subtypes
  const isZone = featureType === 'zone';
  const isLine = featureType === 'line';
  const line = isLine ? (feature as Line) : null;
  const zone = isZone ? (feature as Zone) : null;

  // Water properties for lines
  const [waterProps, setWaterProps] = useState<WaterProperties>(() => {
    if (line?.water_properties) {
      return JSON.parse(line.water_properties);
    }
    return { flow_type: 'surface' };
  });

  // Catchment properties for zones
  const [catchmentProps, setCatchmentProps] = useState<Partial<CatchmentProperties>>(() => {
    if (zone?.catchment_properties) {
      return JSON.parse(zone.catchment_properties);
    }
    return { is_catchment: false };
  });

  // Swale properties for zones
  const [swaleProps, setSwaleProps] = useState<Partial<SwaleProperties>>(() => {
    if (zone?.swale_properties) {
      return JSON.parse(zone.swale_properties);
    }
    return { is_swale: false };
  });

  // Auto-calculate area/length
  const [autoCalcArea, setAutoCalcArea] = useState<number>(0);
  const [autoCalcLength, setAutoCalcLength] = useState<number>(0);

  useEffect(() => {
    if (feature.geometry) {
      const geom = JSON.parse(feature.geometry);
      if (isZone) {
        setAutoCalcArea(calculateAreaFromGeometry(geom));
      } else if (isLine) {
        setAutoCalcLength(calculateLengthFromGeometry(geom));
      }
    }
  }, [feature.geometry, isZone, isLine]);

  // Auto-calculate catchment capture
  const estimatedCapture = catchmentProps.is_catchment && catchmentProps.rainfall_inches_per_year
    ? calculateCatchmentCapture({
        catchmentAreaSqFt: autoCalcArea || 0,
        annualRainfallInches: catchmentProps.rainfall_inches_per_year
      })
    : 0;

  // Auto-calculate swale capacity
  const estimatedCapacity = swaleProps.is_swale && swaleProps.length_feet && swaleProps.cross_section_width_feet && swaleProps.cross_section_depth_feet
    ? calculateSwaleCapacity({
        lengthFeet: swaleProps.length_feet,
        widthFeet: swaleProps.cross_section_width_feet,
        depthFeet: swaleProps.cross_section_depth_feet
      })
    : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};

      if (isLine) {
        payload.water_properties = JSON.stringify(waterProps);
      } else if (isZone) {
        if (catchmentProps.is_catchment) {
          payload.catchment_properties = JSON.stringify({
            ...catchmentProps,
            estimated_capture_gallons: estimatedCapture
          });
        }
        if (swaleProps.is_swale) {
          payload.swale_properties = JSON.stringify({
            ...swaleProps,
            estimated_volume_gallons: estimatedCapacity
          });
        }
      }

      await onSave(payload);

      toast({
        title: 'Water properties saved',
        description: 'Your water system configuration has been updated.'
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Droplets className="w-6 h-6 text-blue-600" />
          Water Properties
        </h2>
      </div>

      {/* Line water properties */}
      {isLine && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flow Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Flow Type</Label>
              <Select
                value={waterProps.flow_type}
                onValueChange={(value: any) => setWaterProps({ ...waterProps, flow_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surface">Surface Flow</SelectItem>
                  <SelectItem value="underground">Underground</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Flow Rate Estimate (optional)</Label>
              <Input
                value={waterProps.flow_rate_estimate || ''}
                onChange={(e) => setWaterProps({ ...waterProps, flow_rate_estimate: e.target.value })}
                placeholder="e.g., 5 GPM, 100 GPM during storms"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Estimated gallons per minute (GPM) or other units
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Auto-calculated Length:</p>
                  <p>{autoCalcLength.toLocaleString()} feet</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone catchment properties */}
      {isZone && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Catchment Properties</CardTitle>
                <Badge variant={catchmentProps.is_catchment ? 'default' : 'outline'}>
                  {catchmentProps.is_catchment ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-catchment"
                  checked={catchmentProps.is_catchment || false}
                  onChange={(e) => setCatchmentProps({ ...catchmentProps, is_catchment: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is-catchment" className="cursor-pointer">
                  This zone collects rainwater
                </Label>
              </div>

              {catchmentProps.is_catchment && (
                <>
                  <div>
                    <Label>Annual Rainfall (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={catchmentProps.rainfall_inches_per_year || ''}
                      onChange={(e) => setCatchmentProps({
                        ...catchmentProps,
                        rainfall_inches_per_year: parseFloat(e.target.value) || undefined
                      })}
                      placeholder="e.g., 40"
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-900">Calculated Values</h4>
                    </div>
                    <div className="space-y-2 text-sm text-green-900">
                      <div className="flex justify-between">
                        <span>Catchment Area:</span>
                        <span className="font-semibold">{autoCalcArea.toLocaleString()} sq ft</span>
                      </div>
                      {estimatedCapture > 0 && (
                        <div className="flex justify-between">
                          <span>Estimated Annual Capture:</span>
                          <span className="font-semibold">{estimatedCapture.toLocaleString()} gallons</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Swale Properties</CardTitle>
                <Badge variant={swaleProps.is_swale ? 'default' : 'outline'}>
                  {swaleProps.is_swale ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-swale"
                  checked={swaleProps.is_swale || false}
                  onChange={(e) => setSwaleProps({ ...swaleProps, is_swale: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is-swale" className="cursor-pointer">
                  This zone functions as a swale
                </Label>
              </div>

              {swaleProps.is_swale && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Length (ft)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={swaleProps.length_feet || ''}
                        onChange={(e) => setSwaleProps({
                          ...swaleProps,
                          length_feet: parseFloat(e.target.value) || undefined
                        })}
                        placeholder="150"
                      />
                    </div>
                    <div>
                      <Label>Width (ft)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={swaleProps.cross_section_width_feet || ''}
                        onChange={(e) => setSwaleProps({
                          ...swaleProps,
                          cross_section_width_feet: parseFloat(e.target.value) || undefined
                        })}
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <Label>Depth (ft)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={swaleProps.cross_section_depth_feet || ''}
                        onChange={(e) => setSwaleProps({
                          ...swaleProps,
                          cross_section_depth_feet: parseFloat(e.target.value) || undefined
                        })}
                        placeholder="1.5"
                      />
                    </div>
                  </div>

                  {estimatedCapacity > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Estimated Capacity</h4>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {estimatedCapacity.toLocaleString()} gallons
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Assumes 2:1 side slopes (standard for swales)
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Properties'}
        </Button>
      </div>
    </div>
  );
}
