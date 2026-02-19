'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { GraduationCap, BookOpen, Loader2, ChevronRight, Trophy } from 'lucide-react';
import type { LearningPath } from '@/lib/db/schema';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function LearnPanel() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/learning/paths').then(r => r.json()),
      fetch('/api/learning/progress').then(r => r.json()).catch(() => null),
    ]).then(([pathsData, progressData]) => {
      setPaths(Array.isArray(pathsData) ? pathsData : []);
      setProgress(progressData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Learn" subtitle="Permaculture education" />
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Progress summary */}
            {progress && (
              <div className="rounded-xl bg-accent/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Your Progress</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress.completed_lessons ?? 0} lessons completed
                  {progress.current_path ? ` \u00b7 ${progress.current_path}` : ''}
                </p>
              </div>
            )}

            {/* Learning paths */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Learning Paths
              </h3>
              {paths.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No learning paths available yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paths.map((path) => (
                    <a
                      key={path.id}
                      href={`/learn/paths/${path.slug}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{path.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {path.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            difficultyColors[path.difficulty] || 'bg-gray-100 text-gray-700'
                          }`}>
                            {path.difficulty}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {path.estimated_lessons} lessons
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
