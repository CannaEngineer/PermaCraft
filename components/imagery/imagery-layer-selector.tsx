'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

interface ImageryLayer {
  id: string;
  label: string;
  visible: boolean;
  opacity: number;
}

interface ImageryLayerSelectorProps {
  farmId: string;
  onLayerToggle: (imageryId: string, visible: boolean) => void;
}

export function ImageryLayerSelector({ farmId, onLayerToggle }: ImageryLayerSelectorProps) {
  const [layers, setLayers] = useState<ImageryLayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImageryLayers();
  }, [farmId]);

  async function loadImageryLayers() {
    try {
      const response = await fetch(`/api/farms/${farmId}/imagery`);
      const data = await response.json();

      const imageryLayers: ImageryLayer[] = data.imagery.map((img: any) => ({
        id: img.id,
        label: img.label,
        visible: Boolean(img.visible),
        opacity: img.opacity || 1.0
      }));

      setLayers(imageryLayers);
    } catch (error) {
      console.error('Failed to load imagery layers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(imageryId: string, visible: boolean) {
    try {
      // Update locally
      setLayers(prev => prev.map(layer =>
        layer.id === imageryId ? { ...layer, visible } : layer
      ));

      // Update database
      await fetch(`/api/farms/${farmId}/imagery/${imageryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible })
      });

      // Notify parent for map update
      onLayerToggle(imageryId, visible);
    } catch (error) {
      console.error('Failed to toggle layer:', error);
    }
  }

  if (loading) {
    return <div>Loading imagery layers...</div>;
  }

  if (layers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Custom Imagery
          </CardTitle>
          <CardDescription>No custom imagery uploaded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Custom Imagery Layers
        </CardTitle>
        <CardDescription>Toggle visibility of uploaded imagery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {layers.map((layer) => (
          <div key={layer.id} className="flex items-center justify-between">
            <Label htmlFor={`layer-${layer.id}`} className="flex items-center gap-2">
              {layer.visible ? (
                <Eye className="h-4 w-4 text-green-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
              {layer.label}
            </Label>
            <Switch
              id={`layer-${layer.id}`}
              checked={layer.visible}
              onCheckedChange={(checked) => handleToggle(layer.id, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
