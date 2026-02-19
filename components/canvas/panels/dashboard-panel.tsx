'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import {
  MapPin, Sprout, TrendingUp, MessageSquare, Plus, ArrowRight,
  BookOpen, GraduationCap, Users, Zap, Trophy, Star, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserStats {
  farmCount: number;
  plantingCount: number;
  analysisCount: number;
}

interface UserProgress {
  total_xp: number;
  current_level: number;
  completed_lessons: number;
}

interface BlogPost {
  title: string;
  slug: string;
  read_time_minutes: number;
  xp_reward: number;
}

export function DashboardPanel() {
  const { farms, setActiveSection, setActiveFarmId } = useUnifiedCanvas();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [latestBlog, setLatestBlog] = useState<BlogPost | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/user/stats').then(r => r.json()).catch(() => null),
      fetch('/api/learning/progress').then(r => r.json()).catch(() => null),
      fetch('/api/blog/recent').then(r => r.json()).catch(() => []),
    ]).then(([statsData, progressData, blogData]) => {
      if (statsData?.farmCount !== undefined) setStats(statsData);
      if (progressData?.id) setProgress(progressData);
      if (Array.isArray(blogData) && blogData.length > 0) setLatestBlog(blogData[0]);
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Home" subtitle="Your permaculture dashboard" />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.farmCount ?? farms.length}</p>
            <p className="text-xs text-muted-foreground">Farms</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <Sprout className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.plantingCount ?? '--'}</p>
            <p className="text-xs text-muted-foreground">Plantings</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <MessageSquare className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.analysisCount ?? '--'}</p>
            <p className="text-xs text-muted-foreground">AI Chats</p>
          </div>
        </div>

        {/* XP progress card */}
        {progress && (
          <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold">{progress.total_xp}</span>
                  <span className="text-xs font-medium text-primary">XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" />
                    Level {progress.current_level}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5" />
                    {progress.completed_lessons} lessons
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('learn')}
                className="text-xs text-primary font-medium hover:underline"
              >
                Learn more
              </button>
            </div>
          </div>
        )}

        {/* Your farms */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Farms</h3>
            <button
              onClick={() => router.push('/farm/new')}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
          <div className="space-y-1">
            {farms.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">Start your permaculture journey</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first farm to begin designing with AI-powered tools.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => router.push('/farm/new')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Farm
                  </button>
                  <button
                    onClick={() => setActiveSection('explore')}
                    className="text-xs text-primary hover:underline"
                  >
                    Explore the community
                  </button>
                </div>
              </div>
            ) : (
              farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => {
                    setActiveFarmId(farm.id);
                    setActiveSection('farm');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{farm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        farm.acres ? `${farm.acres} acres` : null,
                        farm.climate_zone ? `Zone ${farm.climate_zone}` : null,
                      ].filter(Boolean).join(' \u00b7 ') || 'No details'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Latest blog post */}
        {latestBlog && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Latest Article</h3>
            <a
              href={`/learn/blog/${latestBlog.slug}`}
              className="block p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {latestBlog.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{latestBlog.read_time_minutes} min read</span>
                    {latestBlog.xp_reward > 0 && (
                      <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" />
                        +{latestBlog.xp_reward} XP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveSection('farm')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <TrendingUp className="h-4 w-4 text-primary" />
              Edit Farm
            </button>
            <button
              onClick={() => setActiveSection('explore')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <Users className="h-4 w-4 text-blue-500" />
              Community
            </button>
            <button
              onClick={() => setActiveSection('plants')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <Sprout className="h-4 w-4 text-emerald-500" />
              Plants
            </button>
            <button
              onClick={() => setActiveSection('learn')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <GraduationCap className="h-4 w-4 text-green-500" />
              Learn
            </button>
            <button
              onClick={() => setActiveSection('ai')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
              AI Chat
            </button>
            <a
              href="/learn/blog"
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <BookOpen className="h-4 w-4 text-purple-500" />
              Blog
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
