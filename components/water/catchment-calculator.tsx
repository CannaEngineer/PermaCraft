"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Droplets } from "lucide-react";

interface CatchmentCalculatorProps {
  farmId: string;
  zoneId: string;
  zoneName?: string;
  onCalculated?: (result: CatchmentResult) => void;
}

interface CatchmentResult {
  areaSquareFeet: number;
  areaAcres: number;
  estimatedCaptureGallons: number;
}

export function CatchmentCalculator({
  farmId,
  zoneId,
  zoneName,
  onCalculated
}: CatchmentCalculatorProps) {
  const [rainfallInches, setRainfallInches] = useState<string>("40");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatchmentResult | null>(null);
  const { toast } = useToast();

  const handleCalculate = async () => {
    const rainfall = parseFloat(rainfallInches);
    if (isNaN(rainfall) || rainfall <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid rainfall amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/water/calculate-catchment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: zoneId,
          rainfall_inches_per_year: rainfall
        })
      });

      if (!response.ok) {
        throw new Error("Failed to calculate catchment");
      }

      const data = await response.json();
      setResult(data);
      onCalculated?.(data);

      toast({
        title: "Catchment calculated",
        description: `Estimated capture: ${data.estimatedCaptureGallons.toLocaleString()} gallons/year`
      });
    } catch (error) {
      console.error("Error calculating catchment:", error);
      toast({
        title: "Error",
        description: "Failed to calculate catchment area",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          Catchment Calculator
        </CardTitle>
        <CardDescription>
          Calculate water capture potential for {zoneName || "this zone"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rainfall">Annual Rainfall (inches)</Label>
          <Input
            id="rainfall"
            type="number"
            min="0"
            step="0.1"
            value={rainfallInches}
            onChange={(e) => setRainfallInches(e.target.value)}
            placeholder="40"
          />
          <p className="text-xs text-muted-foreground">
            Enter average annual rainfall for your location
          </p>
        </div>

        <Button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Calculating..." : "Calculate Catchment"}
        </Button>

        {result && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Area</span>
              <span className="font-medium">
                {result.areaSquareFeet.toLocaleString()} sq ft ({result.areaAcres} acres)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Annual Capture</span>
              <span className="font-medium text-blue-600">
                {result.estimatedCaptureGallons.toLocaleString()} gal/year
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Average</span>
              <span className="font-medium">
                {Math.round(result.estimatedCaptureGallons / 365).toLocaleString()} gal/day
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
