'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Award, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api/fetch-with-retry';
import { getOperationError } from '@/lib/api/error-messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { queueOperation } from '@/lib/offline/queue';
import { BadgeCelebrationDialog } from './badge-celebration-dialog';

interface LessonCompletionButtonProps {
  lessonSlug: string;
  xpReward: number;
  isCompleted: boolean;
}

export function LessonCompletionButton({
  lessonSlug,
  xpReward,
  isCompleted,
}: LessonCompletionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOnlineStatus();

  const handleComplete = async () => {
    // If offline, queue the operation
    if (isOffline) {
      try {
        queueOperation(
          `/api/learning/lessons/${lessonSlug}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          `Complete lesson: ${lessonSlug}`,
          3
        );

        toast({
          title: 'Queued',
          description: 'Lesson completion will be saved when you\'re back online.',
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
      const data = await apiFetch<{
        success: boolean;
        xp_earned: number;
        badges_earned?: string[];
      }>(
        `/api/learning/lessons/${lessonSlug}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          maxRetries: 2,
        }
      );

      // Show XP toast
      toast({
        title: '🎉 Lesson Complete!',
        description: `You earned ${data.xp_earned} XP`,
      });

      // If badges were earned, show celebration
      if (data.badges_earned && data.badges_earned.length > 0) {
        setNewBadges(data.badges_earned);
        setShowCelebration(true);
      } else {
        // Just refresh the page
        router.refresh();
      }
    } catch (error: any) {
      const friendlyError = getOperationError('complete-lesson', error);
      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    router.refresh();
  };

  if (isCompleted) {
    return null;
  }

  return (
    <>
      <Button
        size="lg"
        onClick={handleComplete}
        disabled={isLoading}
        className="w-full sm:w-auto min-h-[44px] touch-manipulation"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            <span>Completing...</span>
          </>
        ) : isOffline ? (
          <>
            <Clock className="h-5 w-5 mr-2" />
            <span>Queue for Later (+{xpReward} XP)</span>
          </>
        ) : (
          <>
            <Award className="h-5 w-5 mr-2" />
            <span>Complete Lesson (+{xpReward} XP)</span>
          </>
        )}
      </Button>

      <BadgeCelebrationDialog
        open={showCelebration}
        onClose={handleCelebrationClose}
        badgeIds={newBadges}
      />
    </>
  );
}
