'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId?: string;
  onEntryCreated?: () => void;
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

export function JournalEntryForm({ open, onOpenChange, farmId, onEntryCreated }: JournalEntryFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [shareToComm, setShareToComm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = 5 - selectedFiles.length;
    const newFiles = files.slice(0, remaining);

    setSelectedFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of selectedFiles) {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 3000,
        useWebWorker: true,
      });

      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressed);
      });

      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, imageData }),
      });

      if (!res.ok) throw new Error('Failed to upload image');
      const { url } = await res.json();
      urls.push(url);
    }
    return urls;
  };

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
      let mediaUrls: string[] | null = null;
      if (selectedFiles.length > 0) {
        setUploading(true);
        try {
          mediaUrls = await uploadFiles();
        } finally {
          setUploading(false);
        }
      }

      const entry = {
        id: crypto.randomUUID(),
        farm_id: farmId,
        entry_date: Math.floor(date.getTime() / 1000),
        title: title.trim() || null,
        content: content.trim(),
        media_urls: mediaUrls ? JSON.stringify(mediaUrls) : null,
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

      const data = await response.json();

      // Reset form
      setTitle('');
      setContent('');
      setWeather('');
      setTags([]);
      setShareToComm(false);
      setDate(new Date());
      setSelectedFiles([]);
      setPreviewUrls([]);

      if (shareToComm && data.shared === false) {
        toast.success('Journal entry saved (sharing to community failed)');
      } else {
        toast.success('Journal entry saved');
      }

      onEntryCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save journal entry');
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

          {/* Photos */}
          <div>
            <Label>Photos (optional)</Label>
            <div className="mt-2">
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedFiles.length < 5 && (
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  Add Photos ({selectedFiles.length}/5)
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
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
            disabled={!content.trim() || saving || uploading}
          >
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Uploading...</> : saving ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
