'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DesignRationaleFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}

export function DesignRationaleField({
  value,
  onChange,
  maxLength = 500,
  required = true
}: DesignRationaleFieldProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      <Label htmlFor="design-rationale" className="text-base font-semibold">
        Why is this here? {required && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-sm text-muted-foreground">
        Explain your design decision for this element. This is what makes your design educational.
      </p>
      <Textarea
        id="design-rationale"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="E.g., 'This swale is positioned along the contour line to capture runoff from the roof and slow water infiltration into the nursery bed below.'"
        className="min-h-[120px] text-base"
        required={required}
        maxLength={maxLength}
      />
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            isOverLimit
              ? 'text-destructive font-semibold'
              : isNearLimit
              ? 'text-warning font-medium'
              : 'text-muted-foreground'
          }`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  );
}
