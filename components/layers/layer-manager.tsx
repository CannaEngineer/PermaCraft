'use client';

import { Eye, EyeOff, Lock, Unlock, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLayerContext } from '@/contexts/layer-context';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LayerItemProps {
  layer: any;
  isActive: boolean;
  isVisible: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
}

function SortableLayerItem({
  layer,
  isActive,
  isVisible,
  isLocked,
  onSelect,
  onToggleVisibility,
  onToggleLock,
}: LayerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        'hover:bg-accent/50 transition-colors border-b border-border',
        isActive && 'bg-primary/10 border-l-2 border-primary',
        isDragging && 'shadow-lg bg-card opacity-50'
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Color indicator */}
      {layer.color && (
        <div
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: layer.color }}
        />
      )}

      {/* Layer name */}
      <button
        onClick={onSelect}
        className="flex-1 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        {layer.name}
      </button>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onToggleVisibility}
        >
          {isVisible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onToggleLock}
        >
          {isLocked ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function LayerManager() {
  const {
    layers,
    activeLayer,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    reorderLayers,
    isLayerVisible,
    isLayerLocked
  } = useLayerContext();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = layers.findIndex((l) => l.id === active.id);
    const newIndex = layers.findIndex((l) => l.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Reorder using the new index's display_order
      const draggedLayer = layers[oldIndex];
      reorderLayers(draggedLayer.id, newIndex + 1);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Layers</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layer list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layers.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-border">
            {layers.map((layer) => {
              const isActive = activeLayer === layer.id;
              const isVisible = isLayerVisible(layer.id);
              const isLocked = isLayerLocked(layer.id);

              return (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={isActive}
                  isVisible={isVisible}
                  isLocked={isLocked}
                  onSelect={() => setActiveLayer(isActive ? null : layer.id)}
                  onToggleVisibility={() => toggleLayerVisibility(layer.id)}
                  onToggleLock={() => toggleLayerLock(layer.id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Drag to reorder • Click to select</span>
          <span>{layers.length} layers</span>
        </div>
      </div>
    </div>
  );
}
