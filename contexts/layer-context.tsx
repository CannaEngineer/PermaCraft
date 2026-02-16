'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DesignLayer, getLayerOrder } from '@/lib/layers/layer-types';

interface LayerContextValue {
  layers: DesignLayer[];
  visibleLayers: Set<string>;
  lockedLayers: Set<string>;
  activeLayer: string | null;

  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setActiveLayer: (layerId: string | null) => void;
  reorderLayers: (layerId: string, newOrder: number) => void;
  refreshLayers: () => Promise<void>;

  isLayerVisible: (layerId: string) => boolean;
  isLayerLocked: (layerId: string) => boolean;
  isFeatureInActiveLayer: (featureLayerIds: string | null) => boolean;
}

const LayerContext = createContext<LayerContextValue | null>(null);

export function useLayerContext() {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error('useLayerContext must be used within LayerProvider');
  }
  return context;
}

interface LayerProviderProps {
  farmId: string;
  children: React.ReactNode;
}

export function LayerProvider({ farmId, children }: LayerProviderProps) {
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<string>>(new Set());
  const [activeLayer, setActiveLayerState] = useState<string | null>(null);

  // Load layers from API
  const refreshLayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/farms/${farmId}/layers`);
      if (!response.ok) {
        console.error('Failed to fetch layers:', response.statusText);
        return;
      }

      const data = await response.json();

      setLayers(data.layers || []);

      // Update visible/locked sets
      const visible = new Set<string>(
        data.layers.filter((l: DesignLayer) => l.visible).map((l: DesignLayer) => l.id)
      );
      const locked = new Set<string>(
        data.layers.filter((l: DesignLayer) => l.locked).map((l: DesignLayer) => l.id)
      );

      setVisibleLayers(visible);
      setLockedLayers(locked);

      // Set first visible, unlocked layer as active if no active layer set
      if (!activeLayer && data.layers.length > 0) {
        const firstEditable = data.layers.find(
          (l: DesignLayer) => l.visible && !l.locked
        );
        if (firstEditable) {
          setActiveLayerState(firstEditable.id);
        }
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
    }
  }, [farmId, activeLayer]);

  useEffect(() => {
    refreshLayers();
  }, [refreshLayers]);

  // Toggle visibility
  const toggleLayerVisibility = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newVisible = !layer.visible;

    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: newVisible ? 1 : 0 })
      });

      setVisibleLayers(prev => {
        const next = new Set(prev);
        if (newVisible) {
          next.add(layerId);
        } else {
          next.delete(layerId);
        }
        return next;
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }, [farmId, layers, refreshLayers]);

  // Toggle lock
  const toggleLayerLock = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newLocked = !layer.locked;

    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: newLocked ? 1 : 0 })
      });

      setLockedLayers(prev => {
        const next = new Set(prev);
        if (newLocked) {
          next.add(layerId);
        } else {
          next.delete(layerId);
        }
        return next;
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  }, [farmId, layers, refreshLayers]);

  // Reorder layers
  const reorderLayers = useCallback(async (layerId: string, newOrder: number) => {
    try {
      await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder })
      });

      await refreshLayers();
    } catch (error) {
      console.error('Failed to reorder layer:', error);
    }
  }, [farmId, refreshLayers]);

  // Helper functions
  const isLayerVisible = useCallback((layerId: string) => {
    return visibleLayers.has(layerId);
  }, [visibleLayers]);

  const isLayerLocked = useCallback((layerId: string) => {
    return lockedLayers.has(layerId);
  }, [lockedLayers]);

  const isFeatureInActiveLayer = useCallback((featureLayerIds: string | null) => {
    if (!activeLayer || !featureLayerIds) return false;
    try {
      const layers = JSON.parse(featureLayerIds);
      return Array.isArray(layers) && layers.includes(activeLayer);
    } catch {
      return false;
    }
  }, [activeLayer]);

  const value: LayerContextValue = {
    layers: getLayerOrder(layers),
    visibleLayers,
    lockedLayers,
    activeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer: setActiveLayerState,
    reorderLayers,
    refreshLayers,
    isLayerVisible,
    isLayerLocked,
    isFeatureInActiveLayer
  };

  return (
    <LayerContext.Provider value={value}>
      {children}
    </LayerContext.Provider>
  );
}
