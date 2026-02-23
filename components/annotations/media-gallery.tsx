'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, X, ZoomIn, ImageOff } from 'lucide-react';
import type { MediaAttachment } from '@/lib/db/schema';

interface MediaGalleryProps {
  annotationId: string;
  editable?: boolean;
}

export function MediaGallery({ annotationId, editable = false }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<MediaAttachment | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/annotations/${annotationId}/media`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  }, [annotationId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleDelete(mediaId: string) {
    try {
      await fetch(`/api/annotations/${annotationId}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      });
    } catch {
      // Endpoint may not exist yet, silently ignore
    }
    // Re-fetch regardless to stay in sync
    fetchMedia();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-4">
        <ImageOff className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Media</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item) => (
            <div key={item.id} className="relative group">
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => setLightboxItem(item)}
                className="relative aspect-square w-full rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
              >
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
              </button>

              {/* Delete button */}
              {editable && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
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

      {/* Lightbox overlay */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxItem(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            className="absolute top-4 right-4 p-2 text-white hover:text-white/80 z-10"
            aria-label="Close lightbox"
          >
            <X className="h-8 w-8" />
          </button>

          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem.type === 'image' ? (
              <Image
                src={lightboxItem.file_url}
                alt={lightboxItem.caption || 'Annotation media'}
                width={1200}
                height={800}
                className="max-w-full max-h-[85vh] object-contain"
              />
            ) : (
              <video
                src={lightboxItem.file_url}
                controls
                className="max-w-full max-h-[85vh]"
              />
            )}

            {lightboxItem.caption && (
              <p className="text-sm text-white/80 text-center mt-3">
                {lightboxItem.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
