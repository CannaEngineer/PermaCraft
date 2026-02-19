'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import {
  GraduationCap, BookOpen, Loader2, ChevronRight, Trophy,
  Zap, Clock, ArrowRight, Eye, Star
} from 'lucide-react';
import type { LearningPath } from '@/lib/db/schema';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

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

export function LearnPanel() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'paths' | 'blog'>('paths');

  useEffect(() => {
    Promise.all([
      fetch('/api/learning/paths').then(r => r.json()),
      fetch('/api/learning/progress').then(r => r.json()).catch(() => null),
      fetch('/api/blog/recent').then(r => r.json()).catch(() => []),
    ]).then(([pathsData, progressData, blogData]) => {
      setPaths(Array.isArray(pathsData) ? pathsData : []);
      setProgress(progressData?.id ? progressData : null);
      setBlogPosts(Array.isArray(blogData) ? blogData : []);
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
          <div className="space-y-0">
            {/* XP / Progress Card */}
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
                        Level {progress?.current_level ?? 1}
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

            {/* Tab switcher */}
            <div className="flex border-b border-border/30">
              <button
                onClick={() => setActiveTab('paths')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === 'paths'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Learning Paths
              </button>
              <button
                onClick={() => setActiveTab('blog')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === 'blog'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Blog
                {blogPosts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {blogPosts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'paths' ? (
              <div className="p-4">
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
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {path.name}
                          </p>
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
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Browse all link */}
                <div className="mt-4">
                  <a
                    href="/learn"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/50 hover:bg-accent/70 transition-colors text-xs font-medium"
                  >
                    Browse All Lessons
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {blogPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No blog posts yet</p>
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
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {post.read_time_minutes} min
                          </span>
                          {post.xp_reward > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                              <Zap className="h-2.5 w-2.5" />
                              +{post.xp_reward} XP
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Eye className="h-2.5 w-2.5" />
                            {post.view_count}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {timeAgo(post.published_at)}
                          </span>
                        </div>
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {/* Browse all blog link */}
                <div className="mt-4">
                  <a
                    href="/learn/blog"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/50 hover:bg-accent/70 transition-colors text-xs font-medium"
                  >
                    All Blog Posts
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
