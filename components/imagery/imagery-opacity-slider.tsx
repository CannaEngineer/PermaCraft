'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ImageryOpacitySliderProps {
  farmId: string;
  imageryId: string;
  initialOpacity: number;
  onOpacityChange: (imageryId: string, opacity: number) => void;
}

export function ImageryOpacitySlider({
  farmId,
  imageryId,
  initialOpacity,
  onOpacityChange
}: ImageryOpacitySliderProps) {
  const [opacity, setOpacity] = useState(initialOpacity);

  async function handleOpacityChange(value: number[]) {
    const newOpacity = value[0];
    setOpacity(newOpacity);

    // Update database (debounced in production)
    try {
      await fetch(`/api/farms/${farmId}/imagery/${imageryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opacity: newOpacity })
      });

      // Notify parent for immediate map update
      onOpacityChange(imageryId, newOpacity);
    } catch (error) {
      console.error('Failed to update opacity:', error);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`opacity-${imageryId}`}>
        Opacity: {Math.round(opacity * 100)}%
      </Label>
      <Slider
        id={`opacity-${imageryId}`}
        min={0}
        max={1}
        step={0.05}
        value={[opacity]}
        onValueChange={handleOpacityChange}
      />
    </div>
  );
}
