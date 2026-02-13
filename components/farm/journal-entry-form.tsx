'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId?: string;
}

const AVAILABLE_TAGS = [
  'planting',
  'harvest',
  'observation',
  'pest',
  'maintenance',
  'weather',
  'wildlife',
  'other'
];

export function JournalEntryForm({ open, onOpenChange, farmId }: JournalEntryFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [shareToComm, setShareToComm] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || !farmId) return;

    setSaving(true);

    try {
      const entry = {
        id: crypto.randomUUID(),
        farm_id: farmId,
        entry_date: Math.floor(date.getTime() / 1000),
        title: title.trim() || null,
        content: content.trim(),
        media_urls: null, // TODO: Handle file uploads
        weather: weather.trim() || null,
        tags: JSON.stringify(tags),
        is_shared_to_community: shareToComm ? 1 : 0
      };

      const response = await fetch('/api/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (!response.ok) throw new Error('Failed to save entry');

      // Reset form
      setTitle('');
      setContent('');
      setWeather('');
      setTags([]);
      setShareToComm(false);
      setDate(new Date());

      onOpenChange(false);

      // TODO: Show success toast
      console.log('Journal entry saved');
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Farm Observation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., First tomato harvest"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">What happened? *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what you observed, did, or learned today..."
              rows={6}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length} characters
            </p>
          </div>

          {/* Weather */}
          <div>
            <Label htmlFor="weather">Weather (optional)</Label>
            <Input
              id="weather"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="e.g., Sunny, 72°F, light breeze"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Share to Community */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="share"
              checked={shareToComm}
              onCheckedChange={(checked) => setShareToComm(checked === true)}
            />
            <Label htmlFor="share" className="cursor-pointer text-sm">
              Share this entry with the community
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
