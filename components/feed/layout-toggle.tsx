'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGridIcon, LayoutListIcon } from 'lucide-react';

interface LayoutToggleProps {
  onLayoutChange: (layout: 'list' | 'grid') => void;
}

export function LayoutToggle({ onLayoutChange }: LayoutToggleProps) {
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('gallery-layout') as 'list' | 'grid' | null;
    if (saved) {
      setLayout(saved);
      onLayoutChange(saved);
    }
  }, [onLayoutChange]);

  const toggleLayout = () => {
    const newLayout = layout === 'list' ? 'grid' : 'list';
    setLayout(newLayout);
    localStorage.setItem('gallery-layout', newLayout);
    onLayoutChange(newLayout);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLayout}
      className="gap-2"
    >
      {layout === 'list' ? (
        <>
          <LayoutGridIcon className="w-4 h-4" />
          Grid View
        </>
      ) : (
        <>
          <LayoutListIcon className="w-4 h-4" />
          List View
        </>
      )}
    </Button>
  );
}
