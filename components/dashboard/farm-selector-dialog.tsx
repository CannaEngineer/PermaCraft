'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FarmOption {
  id: string;
  name: string;
  acres: number | null;
  center_lat?: number | null;
  center_lng?: number | null;
}

interface FarmSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farms: FarmOption[];
  onSelect: (farmId: string) => void;
  title?: string;
}

export function FarmSelectorDialog({
  open,
  onOpenChange,
  farms,
  onSelect,
  title = 'Select a Farm',
}: FarmSelectorDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {farms.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <MapIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No farms yet. Create one first.</p>
            <Button onClick={() => router.push('/farm/new')}>Create Farm</Button>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {farms.map((farm) => (
              <button
                key={farm.id}
                type="button"
                onClick={() => onSelect(farm.id)}
                className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent transition-colors"
              >
                <p className="font-medium text-sm">{farm.name}</p>
                {farm.acres && (
                  <p className="text-xs text-muted-foreground">{farm.acres} acres</p>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
