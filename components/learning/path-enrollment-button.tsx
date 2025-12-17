'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api/fetch-with-retry';
import { getOperationError } from '@/lib/api/error-messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { queueOperation } from '@/lib/offline/queue';

interface PathEnrollmentButtonProps {
  pathSlug: string;
  pathName: string;
  isCurrentPath: boolean;
  isAuthenticated: boolean;
}

export function PathEnrollmentButton({
  pathSlug,
  pathName,
  isCurrentPath,
  isAuthenticated,
}: PathEnrollmentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOnlineStatus();

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If offline, queue the operation
    if (isOffline) {
      try {
        queueOperation(
          `/api/learning/paths/${pathSlug}/enroll`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          `Enroll in path: ${pathName}`,
          3
        );

        toast({
          title: 'Queued',
          description: 'Path enrollment will be saved when you\'re back online.',
        });
      } catch (error: any) {
        toast({
          title: 'Queue Full',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch<{ success: boolean }>(
        `/api/learning/paths/${pathSlug}/enroll`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          maxRetries: 2,
        }
      );

      toast({
        title: '✅ Path Selected!',
        description: `You're now following the ${pathName} learning path`,
      });

      router.refresh();
    } catch (error: any) {
      const friendlyError = getOperationError('enroll-path', error);
      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCurrentPath) {
    return (
      <Button size="lg" disabled className="gap-2">
        <Check className="h-5 w-5" />
        Current Path
      </Button>
    );
  }

  return (
    <Button size="lg" onClick={handleEnroll} disabled={isLoading} className="gap-2">
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{isAuthenticated ? 'Starting...' : 'Log In to Start'}</span>
        </>
      ) : isOffline ? (
        <>
          <Clock className="h-5 w-5" />
          <span>{isAuthenticated ? 'Queue for Later' : 'Log In to Start'}</span>
        </>
      ) : (
        <span>{isAuthenticated ? 'Start This Path' : 'Log In to Start'}</span>
      )}
    </Button>
  );
}
