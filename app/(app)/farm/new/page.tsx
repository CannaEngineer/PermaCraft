"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/map/location-picker";

export default function NewFarmPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      setError("Please select a location on the map");
      return;
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
          acres: acres ? parseFloat(acres) : null,
          center_lat: location.lat,
          center_lng: location.lng,
          zoom_level: location.zoom,
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
                placeholder="5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Click on the map to set your farm's location</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationPicker
              onLocationSelect={(lat, lng, zoom) => setLocation({ lat, lng, zoom })}
            />
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
          <Button type="submit" disabled={loading || !location}>
            {loading ? "Creating..." : "Create Farm"}
          </Button>
        </div>
      </form>
    </div>
  );
}
