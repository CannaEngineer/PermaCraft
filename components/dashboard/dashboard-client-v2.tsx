'use client';
import { useState } from 'react';
import { DashboardFarm } from '@/lib/db/queries/dashboard';
import { FarmTabStrip } from './farm-tab-strip';
import { FarmIconStrip } from './farm-icon-strip';
import { FarmHeroBar } from './farm-hero-bar';
import { AlertBanner } from './alert-banner';
import { IntelligenceRow } from './intel/intelligence-row';
import { ActivityPanel } from './activity-panel';
import { ProgressPanel } from './progress-panel';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Task } from '@/lib/db/schema';
import { Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

export function DashboardClientV2({ farms, farmData, userId }: Props) {
  const [activeFarmId, setActiveFarmId] = useState(farms[0]?.id ?? '');
  const active = farmData[activeFarmId];

  // Compute which farms have urgent tasks or frost risk for attention dots
  const urgentFarmIds = new Set<string>();
  for (const [id, data] of Object.entries(farmData)) {
    if (data.urgentCount > 0 || data.seasonal.frostRisk) {
      urgentFarmIds.add(id);
    }
  }

  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-4xl">🌱</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">
          Welcome to Permaculture.Studio
        </h2>
        <p className="text-base text-muted-foreground mb-8 max-w-md leading-relaxed">
          Create your first farm to get started with AI-powered, map-based permaculture design.
        </p>
        <Link
          href="/farm/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.97] transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
          Create your first farm
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Farm selector */}
      <div className="hidden md:block border-b border-border/30">
        <FarmTabStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} urgentFarmIds={urgentFarmIds} />
      </div>
      <div className="block md:hidden border-b border-border/30">
        <FarmIconStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} urgentFarmIds={urgentFarmIds} />
      </div>

      {active && (
        <>
          {/* Farm hero */}
          <FarmHeroBar farm={active.farm} ecoFunctions={active.ecoFunctions} />

          {/* Content area */}
          <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6">
            {/* Alerts */}
            <AlertBanner seasonal={active.seasonal} urgentTaskCount={active.urgentCount} />

            {/* Intelligence row */}
            <IntelligenceRow
              seasonal={active.seasonal}
              tasks={active.tasks}
              insights={active.insights}
              ecoScore={active.ecoScore}
              ecoFunctions={active.ecoFunctions}
              farmId={activeFarmId}
            />

            {/* Lower section */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Activity & Progress
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ActivityPanel items={active.activity as any} />
                <ProgressPanel userId={userId} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
