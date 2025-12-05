'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FarmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  initialIsPublic: boolean;
  onDeleteClick?: () => void;
}

export function FarmSettingsDialog({
  open,
  onOpenChange,
  farmId,
  initialIsPublic,
  onDeleteClick,
}: FarmSettingsDialogProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/farms/${farmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: isPublic ? 1 : 0 }),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Farm Settings</DialogTitle>
          <DialogDescription>
            Control who can see your farm and posts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Farm</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to view your farm and posts in the gallery
              </p>
            </div>
            <Button
              variant={isPublic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? 'Public' : 'Private'}
            </Button>
          </div>

          {/* Danger Zone */}
          {onDeleteClick && (
            <div className="pt-4 border-t border-destructive/20">
              <div className="space-y-2">
                <Label className="text-destructive">Danger Zone</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this farm and all associated data
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onDeleteClick();
                  }}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Farm
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
