'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TourEditor } from './tour-editor';
import { TourAnalytics } from './tour-analytics';

interface TourEditorPageProps {
  farmId: string;
  farmName: string;
  tourId: string;
}

export function TourEditorPage({ farmId, farmName, tourId }: TourEditorPageProps) {
  const router = useRouter();
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (showAnalytics) {
    return (
      <TourAnalytics
        farmId={farmId}
        tourId={tourId}
        onBack={() => setShowAnalytics(false)}
      />
    );
  }

  return (
    <TourEditor
      farmId={farmId}
      tourId={tourId}
      onBack={() => router.push(`/farm/${farmId}/tours`)}
      onViewAnalytics={() => setShowAnalytics(true)}
    />
  );
}
