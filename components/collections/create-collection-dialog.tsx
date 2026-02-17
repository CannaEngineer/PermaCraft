'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

interface CreateCollectionDialogProps {
  onCreated?: (collection: any) => void;
  trigger?: React.ReactNode;
}

export function CreateCollectionDialog({ onCreated, trigger }: CreateCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        }),
      });

      if (res.ok) {
        const collection = await res.json();
        onCreated?.(collection);
        setOpen(false);
        setTitle('');
        setDescription('');
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="collection-title">Title</Label>
            <Input
              id="collection-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Favorite Designs"
            />
          </div>
          <div>
            <Label htmlFor="collection-description">Description</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this collection..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="collection-public">Public collection</Label>
            <Switch
              id="collection-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Collection'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
