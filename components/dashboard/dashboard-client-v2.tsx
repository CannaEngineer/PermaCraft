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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">&#127793;</div>
        <h2 className="text-xl font-bold mb-2">Welcome to Permaculture.Studio</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Create your first farm to get started with map-based permaculture design.</p>
        <a href="/farm/new" className="rounded-xl bg-green-800 hover:bg-green-700 text-green-100 font-bold px-6 py-3 transition-colors">
          Create your first farm &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Farm strip — desktop tabs, mobile icons */}
      <div className="hidden md:block">
        <FarmTabStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} urgentFarmIds={urgentFarmIds} />
      </div>
      <div className="block md:hidden">
        <FarmIconStrip farms={farms} activeFarmId={activeFarmId} onSelect={setActiveFarmId} urgentFarmIds={urgentFarmIds} />
      </div>

      {active && (
        <>
          {/* Farm hero */}
          <FarmHeroBar farm={active.farm} ecoFunctions={active.ecoFunctions} />

          {/* Content */}
          <div className="flex flex-col gap-4 p-4">
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

            {/* Lower panels */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ActivityPanel items={active.activity as any} />
              <ProgressPanel userId={userId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
