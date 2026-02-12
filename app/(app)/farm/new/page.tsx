"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Feature, Polygon } from "geojson";

const BoundaryDrawer = dynamic(
  () => import("@/components/map/boundary-drawer").then((mod) => mod.BoundaryDrawer),
  { ssr: false }
);

export default function NewFarmPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState("");
  const [boundary, setBoundary] = useState<{ feature: Feature<Polygon>; areaAcres: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleBoundaryComplete = useCallback((feature: Feature<Polygon>, areaAcres: number) => {
    setBoundary({ feature, areaAcres });
    // Auto-fill acres if not entered
    setAcres((currentAcres) => currentAcres || areaAcres.toFixed(1));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!boundary) {
      setError("Please draw your farm boundary on the map");
      return;
    }

    // Validate area mismatch
    if (acres && Math.abs(parseFloat(acres) - boundary.areaAcres) / boundary.areaAcres > 0.2) {
      const confirmed = confirm(
        `The drawn boundary (${boundary.areaAcres.toFixed(1)} acres) differs from the entered size (${acres} acres) by more than 20%. Continue anyway?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          acres: acres ? parseFloat(acres) : boundary.areaAcres,
          boundary_geometry: JSON.stringify(boundary.feature.geometry),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create farm");
      }

      const data = await res.json();
      router.push(`/farm/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-serif font-bold">Create New Farm</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your permaculture design space</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        {/* Farm Details Card */}
        <div className="container mx-auto px-4 md:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Farm Details</CardTitle>
              <CardDescription>Basic information about your farm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Farm Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Permaculture Farm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your farm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acres">Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                step="0.1"
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
                placeholder="Will auto-fill from boundary"
              />
              <p className="text-xs text-muted-foreground">
                Optional - will use calculated area from boundary if not entered
              </p>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Farm Boundary - Full Width */}
        <div>
          <div className="container mx-auto px-4 md:px-6 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Farm Boundary *</h3>
              <p className="text-sm text-muted-foreground">Draw the boundary of your property on the map</p>
            </div>
          </div>
          <BoundaryDrawer key="farm-boundary-drawer" onBoundaryComplete={handleBoundaryComplete} />
        </div>

        {/* Error and Actions */}
        <div className="container mx-auto px-4 md:px-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !boundary}>
            {loading ? "Creating..." : "Create Farm"}
          </Button>
        </div>
        </div>
      </form>
    </div>
  );
}
