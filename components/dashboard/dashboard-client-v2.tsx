'use client';
import { useEffect, useState } from 'react';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import { FarmHeroCard } from './farm-hero-card';
import { AlertBanner } from './alert-banner';
import { EcoRing } from './eco-ring';
import { SeasonWidget } from './season-widget';
import { TasksWidget } from './tasks-widget';
import { InsightsWidget } from './insights-widget';
import { ActivityTimeline } from './activity-timeline';
import { ProgressPanel } from './progress-panel';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Task } from '@/lib/db/schema';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface FarmData {
  farm: DashboardFarm;
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  tasks: Task[];
  insights: any[];
  activity: any[];
  seasonal: SeasonalContext;
  urgentCount: number;
}

interface Props {
  farms: DashboardFarm[];
  farmData: Record<string, FarmData>;
  userId: string;
}

const ACTIVE_FARM_STORAGE_KEY = 'dashboard:activeFarmId';

export function DashboardClientV2({ farms, farmData, userId }: Props) {
  // SSR-safe: initialize to the first farm; rehydrate from localStorage on mount.
  const [activeFarmId, setActiveFarmId] = useState(farms[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined' || farms.length === 0) return;
    try {
      const stored = window.localStorage.getItem(ACTIVE_FARM_STORAGE_KEY);
      if (stored && farms.some((f) => f.id === stored)) {
        setActiveFarmId(stored);
      }
    } catch {
      // localStorage may be unavailable (private mode, SSR quirks) — ignore silently.
    }
  }, [farms]);

  const selectFarm = (farmId: string) => {
    setActiveFarmId(farmId);
    try {
      window.localStorage.setItem(ACTIVE_FARM_STORAGE_KEY, farmId);
    } catch {
      // ignore
    }
  };

  const active = farmData[activeFarmId];

  const urgentFarmIds = new Set<string>();
  for (const [id, data] of Object.entries(farmData)) {
    if (data.urgentCount > 0 || data.seasonal.frostRisk) {
      urgentFarmIds.add(id);
    }
  }

  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="relative mb-6">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-950/30 flex items-center justify-center">
            <span className="text-5xl">🌱</span>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Plus className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Your land awaits</h2>
        <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
          Create your first farm to start designing with AI-powered permaculture intelligence.
        </p>
        <Link
          href="/farm/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
        >
          Create Your First Farm
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto pb-32">
      {/* Farm selector — horizontal scroll of farm cards */}
      {farms.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
          {farms.map((farm) => (
            <button
              key={farm.id}
              onClick={() => selectFarm(farm.id)}
              className={`relative flex-shrink-0 rounded-2xl border-2 p-3 pr-5 transition-all min-w-[180px] text-left ${
                activeFarmId === farm.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-card hover:bg-muted/50'
              }`}
            >
              {urgentFarmIds.has(farm.id) && (
                <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-border/50">
                  {farm.latest_screenshot ? (
                    <img src={farm.latest_screenshot} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-green-200 to-emerald-300 dark:from-green-800 dark:to-emerald-900" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{farm.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {farm.planting_count} plant{farm.planting_count !== 1 ? 's' : ''}
                    {farm.acres ? ` · ${farm.acres}ac` : ''}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <Link
            href="/farm/new"
            className="flex-shrink-0 flex items-center gap-2 rounded-2xl border-2 border-dashed border-border/60 px-5 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Farm</span>
          </Link>
        </div>
      )}

      {active && (
        <>
          {/* Farm hero card with map preview and key stats */}
          <FarmHeroCard
            farm={active.farm}
            ecoScore={active.ecoScore}
            ecoFunctions={active.ecoFunctions}
            seasonal={active.seasonal}
          />

          {/* Alerts */}
          <AlertBanner seasonal={active.seasonal} urgentTaskCount={active.urgentCount} />

          {/* Intelligence grid — 2 columns on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column: Eco + Season */}
            <div className="flex flex-col gap-4">
              <EcoRing score={active.ecoScore} functions={active.ecoFunctions} />
              <SeasonWidget seasonal={active.seasonal} />
            </div>

            {/* Right column: Tasks + Insights */}
            <div className="flex flex-col gap-4">
              <TasksWidget tasks={active.tasks} farmId={activeFarmId} />
              <InsightsWidget insights={active.insights} farmId={activeFarmId} />
            </div>
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActivityTimeline items={active.activity as any} />
            <ProgressPanel userId={userId} />
          </div>
        </>
      )}
    </div>
  );
}
