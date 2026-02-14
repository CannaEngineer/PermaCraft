'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import imageCompression from 'browser-image-compression';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadButtonProps {
  annotationId: string;
  onUploadComplete: () => void;
}

export function MediaUploadButton({
  annotationId,
  onUploadComplete
}: MediaUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }

      toast({
        title: 'Upload complete',
        description: `${files.length} file(s) uploaded successfully`
      });

      onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function uploadFile(file: File) {
    let processedFile = file;

    // Compress images
    if (file.type.startsWith('image/')) {
      processedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 3000,
        useWebWorker: true
      });
    }

    // Upload to API
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('display_order', '0'); // TODO: Calculate from existing media

    const response = await fetch(`/api/annotations/${annotationId}/media`, {
      method: 'POST',
      body: formData
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
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </>
        )}
      </Button>
    </>
  );
}
