'use client';

import { TourManager } from './tour-manager';

interface ToursDrawerProps {
  farmId: string;
  farmName: string;
}

export function ToursDrawer({ farmId, farmName }: ToursDrawerProps) {
  return (
    <div className="p-4 pb-20">
      <TourManager farmId={farmId} farmName={farmName} />
    </div>
  );
}
