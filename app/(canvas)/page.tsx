'use client';

import { useEffect, useState } from 'react';
import { UnifiedCanvas } from '@/components/canvas/unified-canvas';
import { UnifiedCanvasProvider } from '@/contexts/unified-canvas-context';
import type { Farm } from '@/lib/db/schema';

interface CanvasData {
  farms: Farm[];
  userId: string;
  userName: string | null;
}

export default function CanvasPage() {
  const [data, setData] = useState<CanvasData | null>(null);

  useEffect(() => {
    const el = document.getElementById('canvas-data');
    if (el) {
      try {
        const parsed = JSON.parse(el.textContent || '{}');
        setData(parsed);
      } catch (e) {
        console.error('Failed to parse canvas data:', e);
      }
    }
  }, []);

  if (!data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedCanvasProvider initialFarms={data.farms}>
      <UnifiedCanvas userId={data.userId} userName={data.userName} />
    </UnifiedCanvasProvider>
  );
}
