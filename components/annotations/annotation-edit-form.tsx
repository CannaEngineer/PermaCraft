'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PREDEFINED_TAGS = [
  'soil',
  'water',
  'sunlight',
  'companion',
  'wildlife',
  'seasonal',
  'maintenance',
] as const;

interface AnnotationEditFormProps {
  farmId: string;
  featureId: string;
  featureType: 'zone' | 'planting' | 'line';
  existingAnnotation?: any;
  onSaved?: (annotation: any) => void;
}

export function AnnotationEditForm({
  farmId,
  featureId,
  featureType,
  existingAnnotation,
  onSaved,
}: AnnotationEditFormProps) {
  const [designRationale, setDesignRationale] = useState(
    existingAnnotation?.design_rationale || ''
  );
  const [richNotes, setRichNotes] = useState(
    existingAnnotation?.rich_notes || ''
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingAnnotation?.tags || []
  );
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!designRationale.trim()) {
      toast.error('Design rationale is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        feature_id: featureId,
        feature_type: featureType,
        design_rationale: designRationale.trim(),
        rich_notes: richNotes.trim() || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
      };

      let url: string;
      let method: string;

      if (existingAnnotation) {
        url = `/api/farms/${farmId}/annotations/${existingAnnotation.id}`;
        method = 'PATCH';
      } else {
        url = `/api/farms/${farmId}/annotations`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save annotation');
      }

      const savedAnnotation = await response.json();

      // Parse tags if they come back as a string
      if (typeof savedAnnotation.tags === 'string') {
        savedAnnotation.tags = JSON.parse(savedAnnotation.tags);
      }

      toast.success(
        existingAnnotation ? 'Annotation updated' : 'Annotation created'
      );
      onSaved?.(savedAnnotation);
    } catch (error) {
      console.error('Failed to save annotation:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save annotation'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Design Rationale */}
      <div className="space-y-2">
        <Label htmlFor="design-rationale">
          Why is this here? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="design-rationale"
          value={designRationale}
          onChange={(e) => setDesignRationale(e.target.value)}
          placeholder="E.g., 'This swale captures runoff from the roof and slows water infiltration into the nursery bed below.'"
          className="min-h-[100px]"
          required
        />
      </div>

      {/* Rich Notes */}
      <div className="space-y-2">
        <Label htmlFor="rich-notes">Notes</Label>
        <Textarea
          id="rich-notes"
          value={richNotes}
          onChange={(e) => setRichNotes(e.target.value)}
          placeholder="Additional notes, observations, or plans..."
          className="min-h-[80px]"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={saving || !designRationale.trim()}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : existingAnnotation ? (
            'Update'
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </form>
  );
}
