'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MediaGalleryProps {
  media: Array<{
    id: string;
    type: 'image' | 'video';
    file_url: string;
    thumbnail_url: string | null;
    caption: string | null;
  }>;
  onDelete?: (mediaId: string) => void;
  editable?: boolean;
}

export function MediaGallery({
  media,
  onDelete,
  editable = false
}: MediaGalleryProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Media</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {media.map(item => (
          <div key={item.id} className="relative group">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors">
                  {item.type === 'image' ? (
                    <Image
                      src={item.thumbnail_url || item.file_url}
                      alt={item.caption || 'Annotation media'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={item.file_url}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                </div>
              </DialogTrigger>

              <DialogContent className="max-w-4xl">
                {item.type === 'image' ? (
                  <Image
                    src={item.file_url}
                    alt={item.caption || 'Annotation media'}
                    width={1200}
                    height={800}
                    className="w-full h-auto"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    controls
                    className="w-full h-auto"
                  />
                )}

                {item.caption && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {item.caption}
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete button */}
            {editable && onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Caption */}
            {item.caption && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
