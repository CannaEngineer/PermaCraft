'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ImageIcon, Loader2 } from 'lucide-react';

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  onPhotoUploaded?: () => void;
}

export function PhotoUploadDialog({
  open,
  onOpenChange,
  farmId,
  onPhotoUploaded,
}: PhotoUploadDialogProps) {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!imageFile || uploading) return;

    setUploading(true);
    try {
      // Step 1: Upload photo to R2
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);

      const imageData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });

      const uploadRes = await fetch('/api/upload/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          imageData,
        }),
      });

      if (!uploadRes.ok) throw new Error('Failed to upload photo');

      const { url } = await uploadRes.json();

      // Step 2: Create post with photo URL
      const postRes = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          content: caption.trim() || null,
          media_urls: [url],
          hashtags: hashtags
            .split(',')
            .map((h) => h.trim().replace(/^#/, ''))
            .filter(Boolean),
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');

      // Reset form
      setCaption('');
      setHashtags('');
      setImageFile(null);
      setPreviewUrl(null);

      onPhotoUploaded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create photo post:', error);
      alert('Failed to create photo post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogDescription>
            Share a photo from your farm with the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload photo
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Textarea
              placeholder="Describe your photo..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags (optional)</Label>
            <Input
              placeholder="permaculture, gardening"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!imageFile || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Publish Photo'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
