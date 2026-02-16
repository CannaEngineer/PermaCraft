'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineViz } from './timeline-viz';
import { GrowthPreviewCard } from './growth-preview-card';
import { calculateGrowthMilestones } from '@/lib/time-machine/growth-milestones';
import { getSeason, getSeasonalInfo, getSeasonalActivities } from '@/lib/time-machine/seasonal-context';

interface Planting {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  planted_year: number;
  years_to_maturity: number;
  mature_height_ft: number;
}

interface RedesignedTimeMachineProps {
  plantings: Planting[];
  currentYear: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  onClose?: () => void;
}

export function RedesignedTimeMachine({
  plantings,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
  onClose
}: RedesignedTimeMachineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  // Calculate milestones for all plantings
  const allMilestones = useMemo(() => {
    const milestones = plantings.flatMap(p =>
      calculateGrowthMilestones({
        plantedYear: p.planted_year,
        yearsToMaturity: p.years_to_maturity,
        speciesName: p.common_name,
        layer: p.layer
      })
    );

    // Deduplicate by year and sort
    const uniqueYears = [...new Set(milestones.map(m => m.year))];
    return uniqueYears
      .map(year => milestones.find(m => m.year === year)!)
      .sort((a, b) => a.year - b.year);
  }, [plantings]);

  // Playback interval
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (currentYear >= maxYear) {
        setIsPlaying(false);
        return;
      }
      onYearChange(currentYear + 1);
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, currentYear, maxYear, playbackSpeed, onYearChange]);

  // Get current season
  const currentSeason = getSeason(new Date(currentYear, 0, 1).getMonth());
  const seasonalInfo = getSeasonalInfo(currentSeason);
  const seasonalActivities = getSeasonalActivities(currentSeason);

  // Calculate growth for each planting
  const plantingPreviews = useMemo(() => {
    return plantings.map(planting => {
      const age = currentYear - planting.planted_year;
      const growthFraction = Math.min(age / planting.years_to_maturity, 1);

      // Sigmoid curve for realistic growth
      const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
      const currentSize = sigmoid(growthFraction) * 100;

      // Find next milestone
      const milestones = calculateGrowthMilestones({
        plantedYear: planting.planted_year,
        yearsToMaturity: planting.years_to_maturity,
        speciesName: planting.common_name,
        layer: planting.layer
      });
      const nextMilestone = milestones.find(m => m.year > currentYear);

      return {
        id: planting.id,
        commonName: planting.common_name,
        scientificName: planting.scientific_name,
        layer: planting.layer,
        currentSize,
        nextMilestone
      };
    });
  }, [plantings, currentYear]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">Time Machine</h2>
          <p className="text-xs text-muted-foreground">
            Simulate plant growth over {maxYear - minYear} years
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6 border-b border-border">
        <TimelineViz
          minYear={minYear}
          maxYear={maxYear}
          currentYear={currentYear}
          milestones={allMilestones}
          onYearChange={onYearChange}
        />

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onYearChange(minYear)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>

          {/* Speed control */}
          <div className="flex gap-1">
            {([1, 2, 4] as const).map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "ghost"}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                className="w-10"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 p-4">
          {/* Seasonal context */}
          <motion.div
            className="bg-card border border-border rounded-lg p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{seasonalInfo.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {seasonalInfo.label} {currentYear}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {seasonalInfo.description}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Seasonal activities:
              </div>
              <ul className="space-y-1">
                {seasonalActivities.map((activity, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Growth previews */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Plant Growth ({plantingPreviews.length})
            </h3>
            <AnimatePresence mode="popLayout">
              {plantingPreviews.slice(0, 5).map(preview => (
                <GrowthPreviewCard
                  key={preview.id}
                  planting={preview}
                />
              ))}
            </AnimatePresence>
            {plantingPreviews.length > 5 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                +{plantingPreviews.length - 5} more plants
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
