'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GrowthMilestone, getMilestoneIcon } from '@/lib/time-machine/growth-milestones';

interface PlantingPreview {
  id: string;
  commonName: string;
  scientificName: string;
  layer: string;
  currentSize: number; // Percentage of mature size
  nextMilestone?: GrowthMilestone;
}

interface GrowthPreviewCardProps {
  planting: PlantingPreview;
  className?: string;
}

export function GrowthPreviewCard({ planting, className }: GrowthPreviewCardProps) {
  const { commonName, scientificName, layer, currentSize, nextMilestone } = planting;

  return (
    <motion.div
      className={cn(
        'bg-card border border-border rounded-lg p-4',
        'hover:shadow-md transition-shadow',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">{commonName}</h4>
          <p className="text-xs text-muted-foreground italic">{scientificName}</p>
        </div>
        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded capitalize">
          {layer}
        </span>
      </div>

      {/* Growth progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Growth</span>
          <span className="font-semibold text-foreground">{Math.round(currentSize)}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentSize}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Next milestone */}
        {nextMilestone && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">Next milestone:</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg">
                {getMilestoneIcon(nextMilestone.type)}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {nextMilestone.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Year {nextMilestone.year}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
