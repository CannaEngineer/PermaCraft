'use client';

import { Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayerItemProps {
  layer: {
    id: string;
    name: string;
    color: string | null;
    visible: number;
    locked: number;
  };
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export function LayerItem({ layer, onToggleVisibility, onDelete }: LayerItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-accent group">
      {/* Visibility toggle */}
      <button
        onClick={onToggleVisibility}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-background rounded"
      >
        {layer.visible === 1 ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Color swatch */}
      {layer.color && (
        <div
          className="w-4 h-4 rounded-full border border-border flex-shrink-0"
          style={{ backgroundColor: layer.color }}
        />
      )}

      {/* Layer name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{layer.name}</p>
      </div>

      {/* Lock indicator */}
      {layer.locked === 1 && (
        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}

      {/* Delete button (show on hover) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
