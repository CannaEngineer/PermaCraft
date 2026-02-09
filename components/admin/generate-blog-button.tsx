'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Loader2, CheckCircle2, XCircle, Sparkles, FileText, Tags } from 'lucide-react';
import { toast } from 'sonner';

type GenerationStage =
  | 'idle'
  | 'discovering'
  | 'generating'
  | 'saving'
  | 'complete'
  | 'error';

export function GenerateBlogButton() {
  const router = useRouter();
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const stageInfo = {
    discovering: { icon: Sparkles, text: 'Discovering trending topics...', progress: 20 },
    generating: { icon: FileText, text: 'Generating SEO-optimized content...', progress: 60 },
    saving: { icon: Tags, text: 'Adding tags and publishing...', progress: 90 },
    complete: { icon: CheckCircle2, text: 'Blog post published!', progress: 100 },
  };

  const handleGenerate = async () => {
    setStage('discovering');
    setError(null);
    setProgress(0);

    try {
      // Simulate stage progression (since API is single call)
      setProgress(20);

      const response = await fetch('/api/blog/generate-manual', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        let errorMessage = data.error || 'Failed to generate post';

        if (data.error?.includes('Unauthorized') || data.error?.includes('Admin')) {
          errorMessage = 'Admin access required';
        } else if (data.error?.includes('API key') || data.error?.includes('OpenRouter')) {
          errorMessage = 'AI service configuration error - check OpenRouter API key';
        } else if (data.error?.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded - please wait a moment';
        } else if (data.error?.includes('timeout')) {
          errorMessage = 'Generation timed out - please try again';
        }

        throw new Error(errorMessage);
      }

      // Progress through stages
      setStage('generating');
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));

      setStage('saving');
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));

      setStage('complete');
      setProgress(100);

      toast.success(
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Blog post published!</p>
            <p className="text-sm text-muted-foreground mt-1">{data.title}</p>
            <a
              href={`/learn/blog/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View post →
            </a>
          </div>
        </div>,
        { duration: 8000 }
      );

      setTimeout(() => {
        setStage('idle');
        router.refresh();
      }, 2000);

    } catch (error: any) {
      setStage('error');
      setError(error.message || 'Generation failed');

      toast.error(
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Generation failed</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>,
        { duration: 6000 }
      );

      setTimeout(() => setStage('idle'), 3000);
    }
  };

  const isGenerating = stage !== 'idle' && stage !== 'complete' && stage !== 'error';

  if (stage !== 'idle' && stage !== 'error') {
    const info = stageInfo[stage as keyof typeof stageInfo];
    const Icon = info?.icon || Loader2;

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Icon className="h-5 w-5 text-primary animate-pulse" />
                {stage !== 'complete' && (
                  <Loader2 className="h-5 w-5 text-primary absolute inset-0 animate-spin" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{info?.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stage === 'discovering' && 'Analyzing permaculture trends...'}
                  {stage === 'generating' && 'Writing 1500-2500 words...'}
                  {stage === 'saving' && 'Optimizing for search engines...'}
                  {stage === 'complete' && 'Ready to view!'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === 'error') {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Generation Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <Button
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      onClick={handleGenerate}
      variant="outline"
      disabled={isGenerating}
    >
      <Zap className="h-4 w-4 mr-2" />
      Generate Now
    </Button>
  );
}
