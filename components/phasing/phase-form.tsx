'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PhaseFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function PhaseForm({ initialData, onSubmit, onCancel }: PhaseFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState(
    initialData?.start_date
      ? new Date(initialData.start_date * 1000).toISOString().split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.end_date
      ? new Date(initialData.end_date * 1000).toISOString().split('T')[0]
      : ''
  );
  const [color, setColor] = useState(initialData?.color || '#3b82f6');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onSubmit({
      name,
      description: description || null,
      start_date: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : null,
      end_date: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : null,
      color
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phase-name">Phase Name *</Label>
        <Input
          id="phase-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Year 1: Infrastructure"
          required
        />
      </div>

      <div>
        <Label htmlFor="phase-description">Description (optional)</Label>
        <Textarea
          id="phase-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what will be implemented in this phase..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-date">Start Date (optional)</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="end-date">End Date (optional)</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phase-color">Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="phase-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-20 h-10"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {initialData ? 'Update Phase' : 'Create Phase'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
