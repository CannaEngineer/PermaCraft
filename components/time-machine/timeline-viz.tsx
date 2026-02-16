'use client';

import { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { cn } from '@/lib/utils';
import { GrowthMilestone, getMilestoneIcon, getMilestoneColor } from '@/lib/time-machine/growth-milestones';
import styles from './timeline-viz.module.css';

interface TimelineVizProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  milestones: GrowthMilestone[];
  onYearChange: (year: number) => void;
  className?: string;
}

export function TimelineViz({
  minYear,
  maxYear,
  currentYear,
  milestones,
  onYearChange,
  className
}: TimelineVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Create year scale
  const yearScale = useMemo(() => {
    return scaleLinear()
      .domain([minYear, maxYear])
      .range([0, 100]); // Percentage
  }, [minYear, maxYear]);

  // Handle drag to change year
  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    const year = Math.round(minYear + (percentage / 100) * (maxYear - minYear));
    onYearChange(year);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleDrag(e);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const currentPercentage = yearScale(currentYear);

  return (
    <div className={cn('relative', className)}>
      {/* Timeline track */}
      <div
        ref={containerRef}
        className={cn(
          'relative h-16 bg-muted rounded-full cursor-pointer',
          'select-none touch-none',
          styles.timeline
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={() => isDragging.current = true}
        onTouchMove={handleDrag}
        onClick={handleDrag}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={false}
          animate={{ width: `${currentPercentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Milestone markers */}
        {milestones.map((milestone, index) => {
          const percentage = yearScale(milestone.year);
          const isPast = milestone.year <= currentYear;

          return (
            <motion.div
              key={index}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-10 h-10 rounded-full',
                'flex items-center justify-center',
                'border-2 border-background',
                'cursor-pointer z-10',
                'transition-all duration-200',
                isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                styles.milestone
              )}
              style={{
                left: `${percentage}%`,
                backgroundColor: isPast ? getMilestoneColor(milestone.type) : undefined
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onYearChange(milestone.year);
              }}
            >
              <span className="text-lg">
                {getMilestoneIcon(milestone.type)}
              </span>
            </motion.div>
          );
        })}

        {/* Current year indicator */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-14 h-14 rounded-full',
            'bg-primary border-4 border-background',
            'flex items-center justify-center',
            'shadow-lg z-20',
            'cursor-grab active:cursor-grabbing',
            styles.indicator
          )}
          style={{ left: `${currentPercentage}%` }}
          drag="x"
          dragConstraints={containerRef}
          dragElastic={0}
          onDrag={(_, info) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, ((info.point.x - rect.left) / rect.width) * 100));
            const year = Math.round(minYear + (percentage / 100) * (maxYear - minYear));
            onYearChange(year);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-center">
            <div className="text-[10px] font-bold text-primary-foreground">
              {currentYear}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Year labels */}
      <div className="flex justify-between mt-2 px-2">
        <span className="text-xs text-muted-foreground">{minYear}</span>
        <span className="text-xs text-muted-foreground">{maxYear}</span>
      </div>
    </div>
  );
}
