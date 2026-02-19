'use client';

import { UnifiedCanvas } from '@/components/canvas/unified-canvas';
import { UnifiedCanvasProvider } from '@/contexts/unified-canvas-context';
import type { Farm } from '@/lib/db/schema';

interface CanvasClientProps {
  farms: Farm[];
  userId: string;
  userName: string | null;
}

export function CanvasClient({ farms, userId, userName }: CanvasClientProps) {
  return (
    <UnifiedCanvasProvider initialFarms={farms}>
      <UnifiedCanvas userId={userId} userName={userName} />
    </UnifiedCanvasProvider>
  );
}
