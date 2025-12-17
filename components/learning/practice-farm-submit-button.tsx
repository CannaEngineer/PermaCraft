'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api/fetch-with-retry';
import { getOperationError, formatErrorForToast } from '@/lib/api/error-messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PracticeFarmSubmitButtonProps {
  practiceFarmId: string;
}

export function PracticeFarmSubmitButton({ practiceFarmId }: PracticeFarmSubmitButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOnlineStatus();

  const handleSubmit = async () => {
    // Check if offline before attempting
    if (isOffline) {
      toast({
        title: 'You\'re Offline',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiFetch<{
        success: boolean;
        feedback: { overall_score: number };
        xp_earned: number;
      }>(
        `/api/learning/practice-farms/${practiceFarmId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          maxRetries: 2,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            toast({
              title: 'Retrying...',
              description: `Attempt ${attempt} of 2`,
            });
          },
        }
      );

      toast({
        title: '🎉 Practice Farm Reviewed!',
        description: `You scored ${data.feedback.overall_score}% and earned ${data.xp_earned} XP!`,
      });

      // Reset retry count on success
      setRetryCount(0);

      // Refresh the page to show feedback
      router.refresh();
    } catch (error: any) {
      console.error('Error submitting practice farm:', error);

      // Get user-friendly error message
      const friendlyError = getOperationError('submit-practice-farm', error);

      toast({
        title: friendlyError.title,
        description: `${friendlyError.message}${
          friendlyError.canRetry ? ' You can try again.' : ''
        }`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="lg"
          disabled={isLoading || isOffline}
          className="w-full sm:w-auto min-h-[44px] touch-manipulation"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span>{retryCount > 0 ? `Retrying (${retryCount}/2)...` : 'Submitting...'}</span>
            </>
          ) : isOffline ? (
            <>
              <Send className="h-5 w-5 mr-2 opacity-50" />
              <span>Offline</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Submit for AI Review</span>
              <span className="sm:hidden">Submit for Review</span>
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Submit for AI Review?</AlertDialogTitle>
          <AlertDialogDescription>
            Your practice farm will be evaluated by our AI based on permaculture principles including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Zone logic and placement</li>
              <li>Native species diversity</li>
              <li>Polyculture design</li>
              <li>Systems thinking application</li>
            </ul>
            <p className="mt-3 text-sm">
              You'll receive detailed feedback and earn 100-500 XP based on your score!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="min-h-[44px] touch-manipulation w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            className="min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Submit for Review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
