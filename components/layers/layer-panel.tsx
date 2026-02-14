'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayerItem } from './layer-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LayerPanelProps {
  farmId: string;
  onLayerVisibilityChange?: (layerIds: string[]) => void;
}

export function LayerPanel({ farmId, onLayerVisibilityChange }: LayerPanelProps) {
  const [layers, setLayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f680');

  useEffect(() => {
    loadLayers();
  }, [farmId]);

  async function loadLayers() {
    setLoading(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/layers`);
      const data = await response.json();
      setLayers(data.layers);

      // Notify parent of visible layers
      if (onLayerVisibilityChange) {
        const visibleIds = data.layers
          .filter((l: any) => l.visible === 1)
          .map((l: any) => l.id);
        onLayerVisibilityChange(visibleIds);
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createLayer() {
    if (!newLayerName.trim()) return;

    try {
      await fetch(`/api/farms/${farmId}/layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLayerName,
          color: newLayerColor
        })
      });

      setNewLayerName('');
      setNewLayerColor('#3b82f680');
      setCreateDialogOpen(false);
      loadLayers();
    } catch (error) {
      console.error('Failed to create layer:', error);
    }
  }

  async function toggleVisibility(layerId: string) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: layer.visible === 1 ? 0 : 1 })
    });

    loadLayers();
  }

  async function deleteLayer(layerId: string) {
    if (!confirm('Delete this layer? Features will not be deleted, just unassigned.')) {
      return;
    }

    await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
      method: 'DELETE'
    });

    loadLayers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Design Layers</h3>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Layer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="layer-name">Layer Name</Label>
                <Input
                  id="layer-name"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="e.g., Water Systems"
                />
              </div>
              <div>
                <Label htmlFor="layer-color">Color (optional)</Label>
                <Input
                  id="layer-color"
                  type="color"
                  value={newLayerColor.slice(0, 7)}
                  onChange={(e) => setNewLayerColor(e.target.value + '80')} // Add alpha
                />
              </div>
              <Button onClick={createLayer} className="w-full">
                Create Layer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {layers.map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            onToggleVisibility={() => toggleVisibility(layer.id)}
            onDelete={() => deleteLayer(layer.id)}
          />
        ))}
      </div>

      {layers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No layers yet. Create one to organize your design.
        </p>
      )}
    </div>
  );
}
