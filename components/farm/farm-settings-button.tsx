'use client';

import { Button } from '@/components/ui/button';
import { SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { FarmSettingsDialog } from './farm-settings-dialog';

interface FarmSettingsButtonProps {
  farmId: string;
  initialIsPublic: boolean;
}

export function FarmSettingsButton({ farmId, initialIsPublic }: FarmSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <SettingsIcon className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <FarmSettingsDialog
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        initialIsPublic={initialIsPublic}
      />
    </>
  );
}
