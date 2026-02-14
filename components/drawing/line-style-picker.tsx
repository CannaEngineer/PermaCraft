'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { LineStyle } from '@/lib/db/schema';

interface LineStylePickerProps {
  value: LineStyle;
  onChange: (style: LineStyle) => void;
}

export function LineStylePicker({ value, onChange }: LineStylePickerProps) {
  function updateStyle(updates: Partial<LineStyle>) {
    onChange({ ...value, ...updates });
  }

  return (
    <div className="space-y-4">
      {/* Color */}
      <div>
        <Label htmlFor="line-color">Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="line-color"
            type="color"
            value={value.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-20 h-10"
          />
          <span className="text-sm text-muted-foreground">{value.color}</span>
        </div>
      </div>

      {/* Width */}
      <div>
        <Label htmlFor="line-width">Width: {value.width}px</Label>
        <Slider
          id="line-width"
          min={1}
          max={10}
          step={0.5}
          value={[value.width]}
          onValueChange={([width]) => updateStyle({ width })}
        />
      </div>

      {/* Dash Pattern */}
      <div>
        <Label>Line Style</Label>
        <RadioGroup
          value={getDashPatternKey(value.dashArray)}
          onValueChange={(key) => updateStyle({ dashArray: getDashPattern(key) })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="solid" id="solid" />
            <Label htmlFor="solid" className="flex items-center gap-2">
              Solid <div className="w-12 h-0.5 bg-foreground" />
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dashed" id="dashed" />
            <Label htmlFor="dashed" className="flex items-center gap-2">
              Dashed <div className="w-12 h-0.5 border-t-2 border-dashed border-foreground" />
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dotted" id="dotted" />
            <Label htmlFor="dotted" className="flex items-center gap-2">
              Dotted <div className="w-12 h-0.5 border-t-2 border-dotted border-foreground" />
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Arrow Direction */}
      <div>
        <Label>Arrow Direction</Label>
        <RadioGroup
          value={value.arrowDirection || 'none'}
          onValueChange={(arrowDirection: any) => updateStyle({ arrowDirection })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="arrow-none" />
            <Label htmlFor="arrow-none">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="forward" id="arrow-forward" />
            <Label htmlFor="arrow-forward">Forward →</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="reverse" id="arrow-reverse" />
            <Label htmlFor="arrow-reverse">Reverse ←</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="arrow-both" />
            <Label htmlFor="arrow-both">Both ↔</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Opacity */}
      <div>
        <Label htmlFor="line-opacity">Opacity: {Math.round(value.opacity * 100)}%</Label>
        <Slider
          id="line-opacity"
          min={0}
          max={1}
          step={0.1}
          value={[value.opacity]}
          onValueChange={([opacity]) => updateStyle({ opacity })}
        />
      </div>
    </div>
  );
}

function getDashPatternKey(dashArray?: number[]): string {
  if (!dashArray) return 'solid';
  if (dashArray[0] === 4 && dashArray[1] === 2) return 'dashed';
  if (dashArray[0] === 1 && dashArray[1] === 3) return 'dotted';
  return 'solid';
}

function getDashPattern(key: string): number[] | undefined {
  if (key === 'dashed') return [4, 2];
  if (key === 'dotted') return [1, 3];
  return undefined; // solid
}
