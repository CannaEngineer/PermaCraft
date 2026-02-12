'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { BookOpen, CheckCircle2, Play } from 'lucide-react';
import type { LearningPath } from '@/lib/db/schema';

interface PathSelectorProps {
  path: LearningPath;
  isActive: boolean;
  iconName: string;
  difficultyClass: string;
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

export function PathSelector({ path, isActive, iconName, difficultyClass }: PathSelectorProps) {
  const Icon = getIconComponent(iconName);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSelectPath = async () => {
    if (isActive) return; // Already active

    setLoading(true);
    try {
      const response = await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: path.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to set learning path');
      }

      // Refresh the page to show the new active path
      router.refresh();
    } catch (error) {
      console.error('Error setting learning path:', error);
      alert('Failed to set learning path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={`h-full transition-all duration-300 group border-2 overflow-hidden ${
        isActive
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 cursor-pointer'
      }`}
      onClick={!isActive ? handleSelectPath : undefined}
    >
      {/* Visual Header with Gradient */}
      <div className="h-32 bg-gradient-to-br from-green-500 via-primary to-blue-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Icon and Badge */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          {isActive && (
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Current Path
            </Badge>
          )}
        </div>

        {/* Path Name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white line-clamp-1 mb-1">
            {path.name}
          </h3>
          <div className="flex gap-2">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs">
              {path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1)}
            </Badge>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              {path.estimated_lessons} lessons
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {path.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Icons.Users className="w-4 h-4" />
          <span className="line-clamp-1">{path.target_audience}</span>
        </div>

        {!isActive ? (
          <Button
            className="w-full rounded-xl"
            size="sm"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectPath();
            }}
          >
            {loading ? (
              <>
                <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Path
              </>
            )}
          </Button>
        ) : (
          <div className="text-center py-2 text-sm font-medium text-primary">
            ✓ Following this path
          </div>
        )}
      </CardContent>
    </Card>
  );
}
