'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { STORY_CARD } from '@/lib/design/plant-story-tokens';

interface StoryCardContainerProps {
  children: React.ReactNode[];
  onActiveCardChange?: (index: number) => void;
}

export function StoryCardContainer({ children, onActiveCardChange }: StoryCardContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const index = cardRefs.current.indexOf(entry.target as HTMLElement);
        if (index >= 0) {
          onActiveCardChange?.(index);
        }
      }
    }
  }, [onActiveCardChange]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
    });

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [handleIntersection, children.length]);

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory"
    >
      {children.map((child, i) => (
        <motion.section
          key={i}
          ref={(el) => { cardRefs.current[i] = el; }}
          data-story-card
          className={STORY_CARD.base}
          initial={STORY_CARD.animation.initial}
          whileInView={STORY_CARD.animation.whileInView}
          transition={STORY_CARD.animation.transition}
          viewport={STORY_CARD.animation.viewport}
        >
          <div className={STORY_CARD.inner}>
            {child}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
