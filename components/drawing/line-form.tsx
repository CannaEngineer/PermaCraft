'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineTypeSelector } from './line-type-selector';
import { LineStylePicker } from './line-style-picker';
import { getLineTypeConfig } from '@/lib/map/line-types';
import type { LineStyle } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';

interface LineFormProps {
  farmId: string;
  geometry: any; // GeoJSON LineString
  onComplete: () => void;
  onCancel: () => void;
}

export function LineForm({ farmId, geometry, onComplete, onCancel }: LineFormProps) {
  const [lineType, setLineType] = useState('custom');
  const [label, setLabel] = useState('');
  const [style, setStyle] = useState<LineStyle>(getLineTypeConfig('custom').defaultStyle);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function handleTypeChange(type: string) {
    setLineType(type);
    // Auto-apply default style for type
    setStyle(getLineTypeConfig(type).defaultStyle);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry,
          line_type: lineType,
          label: label || null,
          style
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create line');
      }

      toast({ title: 'Line created successfully' });
      onComplete();
    } catch (error) {
      console.error('Failed to create line:', error);
      toast({
        title: 'Failed to create line',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Line Details</h3>

      <LineTypeSelector value={lineType} onChange={handleTypeChange} />

      <div>
        <Label htmlFor="line-label">Label (optional)</Label>
        <Input
          id="line-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Main Swale, North Fence"
        />
      </div>

      <LineStylePicker value={style} onChange={setStyle} />

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Creating...' : 'Create Line'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
