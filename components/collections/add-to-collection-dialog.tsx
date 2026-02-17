'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Plus, FolderPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateCollectionDialog } from './create-collection-dialog';

interface Collection {
  id: string;
  title: string;
  item_count: number;
}

interface AddToCollectionDialogProps {
  postId: string;
  trigger?: React.ReactNode;
}

export function AddToCollectionDialog({ postId, trigger }: AddToCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/collections/mine')
        .then((r) => r.json())
        .then((data) => {
          setCollections(Array.isArray(data) ? data : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAdd = async (collectionId: string) => {
    if (addingTo) return;
    setAddingTo(collectionId);

    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });

      if (res.ok) {
        setAddedTo((prev) => new Set([...prev, collectionId]));
      }
    } catch (error) {
      console.error('Failed to add to collection:', error);
    } finally {
      setAddingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <FolderPlus className="w-4 h-4" />
            <span>Collect</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                You don't have any collections yet.
              </p>
              <CreateCollectionDialog
                onCreated={(collection) => {
                  setCollections((prev) => [collection, ...prev]);
                }}
              />
            </div>
          ) : (
            <>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleAdd(collection.id)}
                  disabled={addedTo.has(collection.id) || addingTo === collection.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  <div className="text-left">
                    <p className="font-medium text-sm">{collection.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {collection.item_count} items
                    </p>
                  </div>
                  {addedTo.has(collection.id) ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : addingTo === collection.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
              <div className="pt-2 border-t">
                <CreateCollectionDialog
                  onCreated={(collection) => {
                    setCollections((prev) => [collection, ...prev]);
                  }}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Create New Collection
                    </Button>
                  }
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
