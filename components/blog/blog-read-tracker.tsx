'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Award, TrendingUp } from 'lucide-react';

interface BlogReadTrackerProps {
  userId: string;
  postId: string;
  xpReward: number;
  readTimeMinutes: number;
}

export function BlogReadTracker({
  userId,
  postId,
  xpReward,
  readTimeMinutes,
}: BlogReadTrackerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Track time spent on page (minimum 50% of estimated read time)
  useEffect(() => {
    const minTime = (readTimeMinutes * 60 * 1000) * 0.5; // 50% of read time in ms
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minTime);

    return () => clearTimeout(timer);
  }, [readTimeMinutes]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      // Mark as started when user scrolls 10%
      if (!hasStarted && scrollPercent > 10) {
        setHasStarted(true);
        recordStart();
      }

      // Mark as completed when user scrolls 80% AND minimum time has elapsed
      if (!hasCompleted && scrollPercent > 80 && minTimeElapsed) {
        setHasCompleted(true);
        recordCompletion();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasStarted, hasCompleted, minTimeElapsed]);

  const recordStart = async () => {
    try {
      await fetch('/api/blog/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action: 'start',
        }),
      });
    } catch (error) {
      console.error('Failed to record read start:', error);
    }
  };

  const recordCompletion = async () => {
    try {
      const response = await fetch('/api/blog/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action: 'complete',
        }),
      });

      const data = await response.json();

      if (data.xpEarned) {
        // Show XP reward toast
        toast.success(
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">Article Complete!</p>
              <p className="text-sm text-muted-foreground">
                +{data.xpEarned} XP earned
              </p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        );

        // Show badge unlock toasts
        if (data.badgesUnlocked && data.badgesUnlocked.length > 0) {
          setTimeout(() => {
            data.badgesUnlocked.forEach((badge: any, index: number) => {
              setTimeout(() => {
                toast.success(
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-semibold">Badge Unlocked!</p>
                      <p className="text-sm">
                        {badge.icon_name} {badge.name}
                      </p>
                    </div>
                  </div>,
                  {
                    duration: 5000,
                  }
                );
              }, index * 1000);
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to record completion:', error);
    }
  };

  return null; // This is an invisible tracking component
}
