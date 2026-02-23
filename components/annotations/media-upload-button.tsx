'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface MediaUploadButtonProps {
  annotationId: string;
  onUploaded?: () => void;
}

export function MediaUploadButton({
  annotationId,
  onUploaded,
}: MediaUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }

      toast.success('Photo uploaded');
      onUploaded?.();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function uploadFile(file: File) {
    let processedFile = file;

    // Compress images before uploading
    if (file.type.startsWith('image/')) {
      processedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 3000,
        useWebWorker: true,
      });
    }

    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('display_order', '0');

    const response = await fetch(`/api/annotations/${annotationId}/media`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Add Photo
          </>
        )}
      </Button>
    </>
  );
}
