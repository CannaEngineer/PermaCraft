'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { MapPin, Sprout, TrendingUp, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserStats {
  farmCount: number;
  plantingCount: number;
  analysisCount: number;
}

export function DashboardPanel() {
  const { farms, setActiveSection, setActiveFarmId } = useUnifiedCanvas();
  const [stats, setStats] = useState<UserStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/user/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Home" subtitle="Your permaculture dashboard" />
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.farmCount ?? farms.length}</p>
            <p className="text-[10px] text-muted-foreground">Farms</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <Sprout className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.plantingCount ?? '--'}</p>
            <p className="text-[10px] text-muted-foreground">Plantings</p>
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-center">
            <MessageSquare className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{stats?.analysisCount ?? '--'}</p>
            <p className="text-[10px] text-muted-foreground">AI Analyses</p>
          </div>
        </div>

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
              <div className="text-center py-6">
                <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No farms yet</p>
                <button
                  onClick={() => router.push('/farm/new')}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Create your first farm
                </button>
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
              <Sprout className="h-4 w-4 text-green-500" />
              Explore
            </button>
            <button
              onClick={() => setActiveSection('plants')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <Sprout className="h-4 w-4 text-emerald-500" />
              Plants
            </button>
            <button
              onClick={() => setActiveSection('ai')}
              className="flex items-center gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
              AI Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
