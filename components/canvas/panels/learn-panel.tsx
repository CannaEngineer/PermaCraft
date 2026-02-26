'use client';

import { useState, useEffect, useCallback } from 'react';
import { PanelHeader } from './panel-header';
import {
  GraduationCap, BookOpen, Loader2, ChevronRight, Trophy,
  Zap, Clock, ArrowRight, Eye, Star, AlertCircle,
  Play, Check, Circle, Building2, Home, TreePine,
  Wheat, Users, Sparkles, ArrowLeft,
} from 'lucide-react';
import type { LearningPath } from '@/lib/db/schema';
import type { ComponentType } from 'react';

// --- Types ---

type LearnView = 'blog' | 'choose-path' | 'my-learning';

interface UserProgress {
  id: string;
  user_id: string;
  learning_path_id: string | null;
  current_level: number;
  total_xp: number;
  completed_lessons: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  read_time_minutes: number;
  xp_reward: number;
  published_at: number;
  view_count: number;
  tags: string[];
}

interface PathLesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  estimated_minutes: number;
  xp_reward: number;
  difficulty: string;
  order_index: number;
  topic_name: string;
  is_required: number;
  is_completed: number;
}

interface MyPathData {
  path: {
    id: string;
    name: string;
    slug: string;
    description: string;
    difficulty: string;
    icon_name: string;
    estimated_lessons: number;
  } | null;
  lessons: PathLesson[];
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  nextLesson: {
    id: string;
    title: string;
    slug: string;
    estimated_minutes: number;
    xp_reward: number;
  } | null;
}

// --- Constants ---

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

const pathIcons: Record<string, ComponentType<{ className?: string }>> = {
  Building2,
  Home,
  TreePine,
  Tractor: Wheat,
  Wheat,
  Users,
  GraduationCap,
};

function getLevelName(level: number): string {
  const levels = ['Seedling', 'Sprout', 'Sapling', 'Tree', 'Grove', 'Forest'];
  return levels[Math.min(level, levels.length - 1)];
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPathIcon(iconName: string): ComponentType<{ className?: string }> {
  return pathIcons[iconName] || BookOpen;
}

// --- Component ---

export function LearnPanel() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [myPath, setMyPath] = useState<MyPathData | null>(null);
  const [activeTab, setActiveTab] = useState<'blog' | 'learning'>('blog');
  const [currentView, setCurrentView] = useState<LearnView>('blog');
  const [error, setError] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const hasChosenPath = !!(progress?.learning_path_id && myPath?.path);

  const fetchMyPath = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/my-path');
      if (!res.ok) return;
      const data = await res.json();
      setMyPath(data);
    } catch {
      // non-critical
    }
  }, []);

  const loadData = useCallback(() => {
    let cancelled = false;

    async function load() {
      try {
        const [pathsData, progressData, blogData] = await Promise.all([
          fetch('/api/learning/paths').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
          fetch('/api/learning/progress').then(r => r.json()).catch(() => null),
          fetch('/api/blog/recent').then(r => r.json()).catch(() => []),
        ]);

        if (cancelled) return;

        setPaths(Array.isArray(pathsData) ? pathsData : []);
        const prog = progressData?.id ? progressData : null;
        setProgress(prog);
        setBlogPosts(Array.isArray(blogData) ? blogData : []);

        if (prog?.learning_path_id) {
          await fetchMyPath();
        }
      } catch (err) {
        console.error('Learn panel load error:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    setError(false);
    load();

    return () => { cancelled = true; };
  }, [fetchMyPath]);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  // Sync tab and view
  const handleTabChange = (tab: 'blog' | 'learning') => {
    setActiveTab(tab);
    if (tab === 'blog') {
      setCurrentView('blog');
    } else {
      setCurrentView(hasChosenPath ? 'my-learning' : 'choose-path');
    }
  };

  const handleEnroll = async (pathId: string) => {
    setEnrolling(pathId);
    try {
      const res = await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: pathId }),
      });
      if (!res.ok) throw new Error('Failed');

      // Refresh progress and path data
      const [progressRes] = await Promise.all([
        fetch('/api/learning/progress').then(r => r.json()),
        fetchMyPath(),
      ]);
      if (progressRes?.id) {
        setProgress(progressRes);
      }
      // After fetching, re-fetch my-path since progress updated
      await fetchMyPath();
      setCurrentView('my-learning');
      setActiveTab('learning');
    } catch {
      // could show error toast
    } finally {
      setEnrolling(null);
    }
  };

  const navigateToChoosePath = () => {
    setActiveTab('learning');
    setCurrentView('choose-path');
  };

  const navigateToMyLearning = () => {
    setActiveTab('learning');
    setCurrentView('my-learning');
  };

  // --- Render helpers ---

  const renderXpCard = () => {
    const level = progress?.current_level ?? 0;
    const levelName = getLevelName(level);

    return (
      <div className="p-4 border-b border-border/30">
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{progress?.total_xp ?? 0}</span>
                <span className="text-xs font-medium text-primary">XP</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {levelName}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {progress?.completed_lessons ?? 0} lessons
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBlogCTA = () => {
    if (hasChosenPath && myPath?.path) {
      const Icon = getPathIcon(myPath.path.icon_name);
      return (
        <button
          onClick={navigateToMyLearning}
          className="w-full rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-3.5 flex items-center gap-3 hover:from-primary/15 hover:to-primary/10 transition-colors min-h-[44px]"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{myPath.path.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${myPath.percentComplete}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {myPath.percentComplete}%
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      );
    }

    return (
      <button
        onClick={navigateToChoosePath}
        className="w-full rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-emerald-500/10 p-4 text-left hover:from-primary/20 hover:via-primary/15 hover:to-emerald-500/15 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Start Your Learning Journey</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a path tailored to your goals
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
        </div>
      </button>
    );
  };

  const renderBlogView = () => (
    <div className="p-4 space-y-4">
      {renderBlogCTA()}

      {blogPosts.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Articles are on the way!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon for permaculture tips and guides.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {blogPosts.map((post) => (
            <a
              key={post.id}
              href={`/learn/blog/${post.slug}`}
              className="block p-3 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </p>
              {post.excerpt && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {post.read_time_minutes} min
                </span>
                {post.xp_reward > 0 && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    <Zap className="h-2.5 w-2.5" />
                    +{post.xp_reward} XP
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-2.5 w-2.5" />
                  {post.view_count}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {timeAgo(post.published_at)}
                </span>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-accent/50 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      <a
        href="/learn/blog"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/50 hover:bg-accent/70 transition-colors text-xs font-medium"
      >
        All Blog Posts
        <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );

  const renderChoosePathView = () => (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Choose Your Path</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick the learning journey that fits your land and goals
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Permaculture learning content is coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Structured learning paths covering zones, guilds, soil health, and more are being prepared.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {paths.map((path) => {
            const Icon = getPathIcon(path.icon_name);
            const isEnrolling = enrolling === path.id;
            return (
              <button
                key={path.id}
                onClick={() => handleEnroll(path.id)}
                disabled={!!enrolling}
                className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left min-h-[44px] disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {isEnrolling ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {path.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {path.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      difficultyColors[path.difficulty] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {path.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {path.estimated_lessons} lessons
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMyLearningView = () => {
    if (!myPath?.path) {
      return (
        <div className="p-4 text-center py-8 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">No path selected</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a learning path to get started.
            </p>
          </div>
          <button
            onClick={navigateToChoosePath}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            Choose a Path
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      );
    }

    const { path, lessons, completedLessons, totalLessons, percentComplete, nextLesson } = myPath;
    const Icon = getPathIcon(path.icon_name);

    return (
      <div className="p-4 space-y-4">
        {/* Path header card */}
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{path.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedLessons} of {totalLessons} complete
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Continue CTA */}
        {nextLesson && (
          <a
            href={`/learn/lessons/${nextLesson.slug}`}
            className="block rounded-xl bg-gradient-to-r from-primary to-emerald-600 p-4 text-white hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Play className="h-5 w-5 fill-white text-white" />
                </div>
                <div className="absolute inset-0 w-10 h-10 rounded-xl bg-white/20 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/70">Up Next</p>
                <p className="text-sm font-semibold truncate">{nextLesson.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-white/80">
                    <Clock className="h-2.5 w-2.5" />
                    {nextLesson.estimated_minutes} min
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/80">
                    <Zap className="h-2.5 w-2.5" />
                    +{nextLesson.xp_reward} XP
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60 flex-shrink-0" />
            </div>
          </a>
        )}

        {/* Lesson list */}
        {lessons.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Lessons coming soon</p>
            <p className="text-xs text-muted-foreground">
              This path is being prepared. Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              All Lessons
            </p>
            {lessons.map((lesson) => {
              const isCompleted = lesson.is_completed === 1;
              const isNext = nextLesson?.id === lesson.id;

              return (
                <a
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.slug}`}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors min-h-[44px] ${
                    isNext
                      ? 'bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-accent/50'
                  } ${isCompleted ? 'opacity-70' : ''}`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : isNext ? (
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                        <Play className="h-3.5 w-3.5 text-primary fill-primary" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center">
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${
                        isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {lesson.title}
                      </p>
                      {isNext && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                          Up Next
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {lesson.topic_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lesson.estimated_minutes} min
                      </span>
                      {lesson.xp_reward > 0 && (
                        <span className="text-xs text-primary/70 font-medium">
                          +{lesson.xp_reward} XP
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Change path */}
        <button
          onClick={navigateToChoosePath}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Change path
        </button>
      </div>
    );
  };

  // --- Main render ---

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Learn" subtitle="Permaculture education" />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <AlertCircle className="h-10 w-10 text-destructive/40 mb-3" />
            <p className="text-sm font-medium mb-1">Failed to load learning content</p>
            <button
              onClick={loadData}
              className="text-xs text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {renderXpCard()}

            {/* Tab switcher */}
            <div className="flex border-b border-border/30">
              <button
                onClick={() => handleTabChange('blog')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === 'blog'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Blog
                {blogPosts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {blogPosts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTabChange('learning')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === 'learning'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                {hasChosenPath ? 'My Learning' : 'Start Learning'}
              </button>
            </div>

            {/* View content */}
            {currentView === 'blog' && renderBlogView()}
            {currentView === 'choose-path' && renderChoosePathView()}
            {currentView === 'my-learning' && renderMyLearningView()}
          </div>
        )}
      </div>
    </div>
  );
}
