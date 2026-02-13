'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Sparkles, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as Icons from 'lucide-react';

interface UserProgress {
  id: string;
  user_id: string;
  learning_path_id: string | null;
  current_level: number;
  total_xp: number;
  created_at: number;
  updated_at: number;
}

interface PathCelebrationProps {
  data: {
    path: {
      id: string;
      name: string;
      icon_name: string;
    };
    totalLessons: number;
    completedLessons: number;
    userProgress: UserProgress | undefined;
  };
}

export function PathCelebration({ data }: PathCelebrationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(3);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleContinue = useCallback(async () => {
    // Reset learning path to null to show wizard
    setIsNavigating(true);
    try {
      await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: null }),
      });
      router.refresh();
    } catch (error) {
      console.error('Error resetting path:', error);
      toast({
        title: 'Something went wrong',
        description: 'Refreshing to try again...',
        variant: 'destructive',
      });
      router.refresh();
    }
    // Note: Don't set isNavigating to false - router.refresh will unmount component
  }, [router, toast]);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  useEffect(() => {
    // Trigger navigation when countdown reaches 0
    if (countdown === 0) {
      handleContinue();
    }
  }, [countdown, handleContinue]);

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const PathIcon = getIconComponent(data.path.icon_name);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Confetti effect - Simple CSS version */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Card className="max-w-2xl w-full relative animate-in zoom-in-95 duration-500">
        <CardContent className="p-8 md:p-12 text-center">
          {/* Badge Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-700 delay-500">
            <PathIcon className="w-12 h-12 text-primary" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
            Path Complete! 🎉
          </h1>
          <p className="text-xl text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
            {data.path.name}
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{data.totalLessons}</p>
              <p className="text-sm text-muted-foreground">Lessons Completed</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1100">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{data.userProgress?.total_xp || 0}</p>
              <p className="text-sm text-muted-foreground">XP Earned</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1200">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">Mastered</p>
              <p className="text-sm text-muted-foreground">Path Status</p>
            </div>
          </div>

          {/* CTA */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1300">
            <p className="text-sm text-muted-foreground mb-4">
              Ready for your next challenge? {countdown > 0 && `(${countdown}s)`}
            </p>
            <Button size="lg" onClick={handleContinue} disabled={isNavigating} className="w-full md:w-auto">
              {isNavigating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Choose Next Path
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
