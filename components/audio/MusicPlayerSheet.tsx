'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import AudioPlayer from '@/components/audio/AudioPlayer';

interface MusicPlayerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MusicPlayerSheet({ open, onOpenChange }: MusicPlayerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] p-0 bg-gradient-to-b from-gray-700 to-gray-900 border-l border-border"
      >
        {/* Accessible title for screen readers */}
        <SheetHeader className="sr-only">
          <SheetTitle>Music Player</SheetTitle>
        </SheetHeader>

        {/* Full Winamp-style player */}
        <div className="h-full">
          <AudioPlayer mode="sidebar" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
