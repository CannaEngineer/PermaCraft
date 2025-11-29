"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BoundaryDrawer } from "@/components/map/boundary-drawer";
import type { Feature, Polygon } from "geojson";

export default function NewFarmPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState("");
  const [boundary, setBoundary] = useState<{ feature: Feature<Polygon>; areaAcres: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleBoundaryComplete = (feature: Feature<Polygon>, areaAcres: number) => {
    setBoundary({ feature, areaAcres });
    // Auto-fill acres if not entered
    if (!acres) {
      setAcres(areaAcres.toFixed(1));
    }
  };

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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Farm</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Farm Boundary *</CardTitle>
            <CardDescription>Draw the boundary of your property</CardDescription>
          </CardHeader>
          <CardContent>
            <BoundaryDrawer onBoundaryComplete={handleBoundaryComplete} />
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
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
      </form>
    </div>
  );
}
