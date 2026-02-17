'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentImage: string | null;
  name: string;
  onUpload: (url: string) => void;
}

export function AvatarUpload({ currentImage, name, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.image) {
        onUpload(data.image);
        setPreview(data.image);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setPreview(currentImage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="w-20 h-20">
          <AvatarImage src={preview || undefined} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            {name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          <Camera className="w-3.5 h-3.5" />
          Change Avatar
        </Button>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 5MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
