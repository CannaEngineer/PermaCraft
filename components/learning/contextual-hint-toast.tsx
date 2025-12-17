'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ContextualHintToastProps {
  triggerType: 'first_zone' | 'first_planting' | 'water_feature' | 'ai_analysis' | 'help_icon';
}

export function useContextualHint(triggerType: ContextualHintToastProps['triggerType']) {
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchAndShowHint = async () => {
      try {
        const response = await fetch(`/api/learning/contextual-hints?trigger=${triggerType}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.hint || !isMounted) return;

        const hint = data.hint;

        // Show toast with hint
        toast({
          title: (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span>Learning Tip</span>
            </div>
          ) as any,
          description: (
            <div className="space-y-3">
              <p>{hint.hint_text}</p>
              <div className="flex gap-2">
                <Link href={`/learn/lessons/${hint.lesson.slug}`}>
                  <Button size="sm" variant="default">
                    Learn More
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    // Dismiss hint
                    await fetch('/api/learning/contextual-hints', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hint_id: hint.id }),
                    });
                  }}
                >
                  Don't show again
                </Button>
              </div>
            </div>
          ) as any,
          duration: 10000, // Show for 10 seconds
        });
      } catch (error) {
        console.error('Error showing contextual hint:', error);
      }
    };

    // Delay showing hint by 1 second to let the action complete
    const timer = setTimeout(fetchAndShowHint, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [triggerType, toast]);
}

// Example usage in farm editor:
// const showZoneHint = useContextualHint('first_zone');
// Call this hook when user creates their first zone
