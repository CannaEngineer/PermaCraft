"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Waves } from "lucide-react";

interface SwaleDesignerProps {
  farmId: string;
  zoneId: string;
  zoneName?: string;
  onCalculated?: (result: SwaleResult) => void;
}

interface SwaleResult {
  lengthFeet: number;
  lengthMeters: number;
  volumeCubicFeet: number;
  volumeGallons: number;
  volumeLiters: number;
}

export function SwaleDesigner({
  farmId,
  zoneId,
  zoneName,
  onCalculated
}: SwaleDesignerProps) {
  const [widthFeet, setWidthFeet] = useState<string>("4");
  const [depthFeet, setDepthFeet] = useState<string>("1.5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwaleResult | null>(null);
  const { toast } = useToast();

  const handleCalculate = async () => {
    const width = parseFloat(widthFeet);
    const depth = parseFloat(depthFeet);

    if (isNaN(width) || width <= 0 || isNaN(depth) || depth <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter valid dimensions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/water/calculate-swale-volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: zoneId,
          cross_section_width_feet: width,
          cross_section_depth_feet: depth
        })
      });

      if (!response.ok) {
        throw new Error("Failed to calculate swale volume");
      }

      const data = await response.json();
      setResult(data);
      onCalculated?.(data);

      toast({
        title: "Swale calculated",
        description: `Capacity: ${data.volumeGallons.toLocaleString()} gallons`
      });
    } catch (error) {
      console.error("Error calculating swale:", error);
      toast({
        title: "Error",
        description: "Failed to calculate swale volume",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // ASCII cross-section diagram
  const renderCrossSection = () => {
    const width = parseFloat(widthFeet) || 4;
    const depth = parseFloat(depthFeet) || 1.5;
    const ratio = depth / width;

    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs">
        <div className="flex flex-col items-center space-y-0.5">
          <div className="text-muted-foreground">← {width}ft →</div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">╱</span>
            <span className="flex-1 border-b border-dashed border-muted-foreground" style={{ width: `${width * 10}px` }} />
            <span className="text-muted-foreground">╲</span>
          </div>
          <div className="text-muted-foreground">↕ {depth}ft</div>
          <div className="text-xs text-muted-foreground mt-2">
            Triangular cross-section
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-blue-600" />
          Swale Designer
        </CardTitle>
        <CardDescription>
          Design swale dimensions for {zoneName || "this feature"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Width (feet)</Label>
            <Input
              id="width"
              type="number"
              min="0"
              step="0.5"
              value={widthFeet}
              onChange={(e) => setWidthFeet(e.target.value)}
              placeholder="4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depth">Depth (feet)</Label>
            <Input
              id="depth"
              type="number"
              min="0"
              step="0.25"
              value={depthFeet}
              onChange={(e) => setDepthFeet(e.target.value)}
              placeholder="1.5"
            />
          </div>
        </div>

        {renderCrossSection()}

        <Button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Calculating..." : "Calculate Volume"}
        </Button>

        {result && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Length</span>
              <span className="font-medium">
                {result.lengthFeet.toLocaleString()} ft ({result.lengthMeters} m)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Capacity</span>
              <span className="font-medium text-blue-600">
                {result.volumeGallons.toLocaleString()} gallons
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Volume</span>
              <span className="font-medium">
                {result.volumeCubicFeet.toLocaleString()} cu ft ({result.volumeLiters.toLocaleString()} L)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
