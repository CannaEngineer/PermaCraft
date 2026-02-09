'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

export function GenerateBlogButton() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating blog post with AI... This may take 30-60 seconds.');

    try {
      const response = await fetch('/api/blog/generate-manual', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate post');
      }

      toast.success(
        <div>
          <p className="font-semibold">Blog post generated!</p>
          <p className="text-sm text-muted-foreground">{data.title}</p>
        </div>,
        { duration: 5000 }
      );

      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate post');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      variant="outline"
      disabled={isGenerating}
    >
      <Zap className="h-4 w-4 mr-2" />
      {isGenerating ? 'Generating...' : 'Generate Now'}
    </Button>
  );
}
