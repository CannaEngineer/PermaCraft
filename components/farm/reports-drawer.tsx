'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TreePine, Sprout, Leaf, Map, BarChart3,
  TrendingUp, CheckCircle2, Package, Flower2,
  Bug, Droplets, Wind, Shield,
} from 'lucide-react';

interface ReportsDrawerProps {
  farmId: string;
}

const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  canopy: { label: 'Canopy', color: 'bg-green-700' },
  understory: { label: 'Understory', color: 'bg-green-500' },
  shrub: { label: 'Shrub', color: 'bg-emerald-500' },
  herbaceous: { label: 'Herbaceous', color: 'bg-lime-500' },
  groundcover: { label: 'Groundcover', color: 'bg-yellow-500' },
  vine: { label: 'Vine', color: 'bg-purple-500' },
  root: { label: 'Root', color: 'bg-amber-700' },
  aquatic: { label: 'Aquatic', color: 'bg-blue-500' },
};

const FUNCTION_ICONS: Record<string, typeof Sprout> = {
  'nitrogen fixer': Sprout,
  'nitrogen-fixer': Sprout,
  'pollinator': Flower2,
  'pest control': Bug,
  'windbreak': Wind,
  'shade provider': TreePine,
  'erosion control': Shield,
  'water management': Droplets,
  'dynamic accumulator': TrendingUp,
};

export function ReportsDrawer({ farmId }: ReportsDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'diversity' | 'harvest' | 'health'>('overview');

  useEffect(() => {
    fetch(`/api/farms/${farmId}/reports`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [farmId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load reports</p>
      </div>
    );
  }

  const { overview, layer_distribution, permaculture_functions, harvest_summary, task_stats, crop_plans } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Farm Reports</h2>
        <p className="text-xs text-muted-foreground">{overview.total_plantings} plantings · {overview.unique_species} species · {overview.zone_count} zones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-0.5">
        {[
          { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { key: 'diversity' as const, label: 'Diversity', icon: Leaf },
          { key: 'harvest' as const, label: 'Harvest', icon: Package },
          { key: 'health' as const, label: 'Health', icon: TrendingUp },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="gap-1 text-[11px] h-7 px-2.5 shrink-0"
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Plantings" value={overview.total_plantings} icon={<Sprout className="h-4 w-4 text-green-600" />} />
            <MetricCard label="Species" value={overview.unique_species} icon={<Leaf className="h-4 w-4 text-emerald-600" />} />
            <MetricCard label="Native %" value={`${overview.native_percentage}%`} icon={<Shield className="h-4 w-4 text-blue-600" />}
              sublabel={overview.native_percentage >= 70 ? 'Great!' : 'Aim 70%+'} />
            <MetricCard label="Zones" value={overview.zone_count} icon={<Map className="h-4 w-4 text-purple-600" />} />
          </div>

          {/* Task Summary */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold mb-1.5">Tasks</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${(task_stats.completed + task_stats.pending + task_stats.in_progress) > 0
                      ? (task_stats.completed / (task_stats.completed + task_stats.pending + task_stats.in_progress)) * 100 : 0}%`
                  }}
                />
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>{task_stats.pending} pending</span>
                <span>{task_stats.in_progress} active</span>
                <span>{task_stats.completed} done</span>
              </div>
            </CardContent>
          </Card>

          {crop_plans && crop_plans.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-1.5">
                <p className="text-xs font-semibold">Active Crop Plans</p>
                {crop_plans.map((plan: any) => (
                  <div key={plan.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{plan.name} <span className="text-muted-foreground">{plan.season} {plan.year}</span></span>
                    <span className="text-muted-foreground">{plan.completed_items}/{plan.total_items} done</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Diversity */}
      {activeTab === 'diversity' && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold mb-2">Species by Layer</p>
              {layer_distribution.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No plantings yet</p>
              ) : (
                <div className="space-y-1.5">
                  {layer_distribution.map((layer: any) => {
                    const config = LAYER_CONFIG[layer.layer] || { label: layer.layer, color: 'bg-gray-400' };
                    const maxCount = Math.max(...layer_distribution.map((l: any) => l.count));
                    const pct = (layer.count / maxCount) * 100;
                    return (
                      <div key={layer.layer} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 text-right">{config.label}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden relative">
                          <div
                            className={`h-full ${config.color} rounded-full transition-all duration-500 flex items-center justify-end pr-1.5`}
                            style={{ width: `${Math.max(pct, 10)}%` }}
                          >
                            <span className="text-[9px] font-bold text-white">{layer.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold mb-2">Permaculture Functions</p>
              {permaculture_functions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No functions tracked</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {permaculture_functions.map((fn: any) => {
                    const Icon = FUNCTION_ICONS[fn.name.toLowerCase()] || Leaf;
                    return (
                      <Badge key={fn.name} variant="secondary" className="gap-0.5 py-0.5 px-2 text-[10px]">
                        <Icon className="h-2.5 w-2.5" />
                        <span className="capitalize">{fn.name}</span>
                        <span className="text-muted-foreground">({fn.count})</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Native ratio ring */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${overview.native_percentage}, 100`} className="text-green-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{overview.native_percentage}%</span>
                </div>
                <div>
                  <p className="text-xs font-medium">Native Species</p>
                  <p className="text-[10px] text-muted-foreground">
                    {overview.native_percentage >= 70 ? 'Excellent ratio!' : 'Aim for 70%+ native species'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Harvest */}
      {activeTab === 'harvest' && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold mb-2">Harvest Log</p>
            {harvest_summary.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No harvests recorded yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {harvest_summary.map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <span className="text-xs font-medium">{h.month}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{h.harvest_count} harvests</span>
                    </div>
                    <span className="text-xs font-semibold">{Math.round(h.total_quantity * 10) / 10} {h.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health */}
      {activeTab === 'health' && (
        <FarmHealthScoreCompact overview={overview} taskStats={task_stats} functionCount={permaculture_functions.length} />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, sublabel }: { label: string; value: string | number; icon: React.ReactNode; sublabel?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
            {sublabel && <p className="text-[9px] text-green-600">{sublabel}</p>}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function FarmHealthScoreCompact({ overview, taskStats, functionCount }: { overview: any; taskStats: any; functionCount: number }) {
  const scores = useMemo(() => {
    const diversityScore = Math.min(overview.unique_species / 20, 1) * 25;
    const nativeScore = (overview.native_percentage / 100) * 25;
    const functionScore = Math.min(functionCount / 8, 1) * 25;
    const taskScore = taskStats.completed > 0
      ? Math.min(taskStats.completed / (taskStats.completed + taskStats.pending + taskStats.in_progress), 1) * 25
      : 0;
    const total = Math.round(diversityScore + nativeScore + functionScore + taskScore);
    return { diversityScore, nativeScore, functionScore, taskScore, total };
  }, [overview, taskStats, functionCount]);

  const scoreLabel = scores.total >= 80 ? 'Thriving' : scores.total >= 60 ? 'Growing' : scores.total >= 40 ? 'Developing' : 'Starting';
  const scoreColor = scores.total >= 80 ? 'text-green-600' : scores.total >= 60 ? 'text-blue-600' : scores.total >= 40 ? 'text-amber-600' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${scores.total}, 100`} className={scoreColor} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor}`}>{scores.total}</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-[10px] text-muted-foreground">Diversity, native ratio, functions, tasks</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            { label: 'Species Diversity', score: scores.diversityScore, max: 25 },
            { label: 'Native Ratio', score: scores.nativeScore, max: 25 },
            { label: 'Functions', score: scores.functionScore, max: 25 },
            { label: 'Task Completion', score: scores.taskScore, max: 25 },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-24">{item.label}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(item.score / item.max) * 100}%` }} />
              </div>
              <span className="text-[10px] font-medium w-7 text-right">{Math.round(item.score)}/{item.max}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
