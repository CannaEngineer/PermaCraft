'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 p-2 rounded hover:bg-accent group">
        {/* Visibility toggle */}
        <button
          onClick={onToggleVisibility}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
          title={layer.visible === 1 ? 'Hide layer' : 'Show layer'}
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

        {/* Delete button (show on hover / always visible on touch) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 md:opacity-0 max-md:opacity-100 flex-shrink-0 text-muted-foreground hover:text-destructive"
          title="Delete layer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Layer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">"{layer.name}"</span>? Features assigned to this layer will not be deleted, just unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Layer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
