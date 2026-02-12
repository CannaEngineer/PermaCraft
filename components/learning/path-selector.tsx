'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import type { LearningPath } from '@/lib/db/schema';

interface PathSelectorProps {
  path: LearningPath;
  isActive: boolean;
  iconComponent: React.ComponentType<{ className?: string }>;
  difficultyClass: string;
}

export function PathSelector({ path, isActive, iconComponent: Icon, difficultyClass }: PathSelectorProps) {
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
      className={`h-full transition-all duration-300 cursor-pointer group border-2 ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'hover:shadow-xl hover:scale-[1.02] hover:border-primary/50'
      }`}
      onClick={handleSelectPath}
    >
      {/* Header with gradient */}
      <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {isActive && (
            <Badge className="bg-primary">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pt-4">
        <CardTitle className={`text-lg ${!isActive && 'group-hover:text-primary'} transition-colors`}>
          {path.name}
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className={difficultyClass}>
            {path.difficulty}
          </Badge>
          <Badge variant="outline">
            <BookOpen className="w-3 h-3 mr-1" />
            {path.estimated_lessons} lessons
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {path.description}
        </p>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground italic">
            👤 {path.target_audience}
          </p>
        </div>
        {!isActive && (
          <Button
            className="w-full rounded-xl mt-2"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectPath();
            }}
          >
            {loading ? 'Setting...' : 'Start This Path'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
