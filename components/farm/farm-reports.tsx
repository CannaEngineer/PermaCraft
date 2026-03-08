'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, TreePine, Sprout, Leaf, Map, BarChart3,
  TrendingUp, CheckCircle2, Clock, Package, Flower2,
  Bug, Droplets, Wind, Sun, Shield,
} from 'lucide-react';
import Link from 'next/link';

interface FarmReportsProps {
  farmId: string;
  farmName: string;
}

const LAYER_CONFIG: Record<string, { label: string; color: string; icon: typeof TreePine }> = {
  canopy: { label: 'Canopy', color: 'bg-green-700', icon: TreePine },
  understory: { label: 'Understory', color: 'bg-green-500', icon: TreePine },
  shrub: { label: 'Shrub', color: 'bg-emerald-500', icon: Leaf },
  herbaceous: { label: 'Herbaceous', color: 'bg-lime-500', icon: Sprout },
  groundcover: { label: 'Groundcover', color: 'bg-yellow-500', icon: Flower2 },
  vine: { label: 'Vine', color: 'bg-purple-500', icon: Leaf },
  root: { label: 'Root', color: 'bg-amber-700', icon: Sprout },
  aquatic: { label: 'Aquatic', color: 'bg-blue-500', icon: Droplets },
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

export function FarmReports({ farmId, farmName }: FarmReportsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'diversity' | 'harvest' | 'progress'>('overview');

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`/api/farms/${farmId}/reports`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [farmId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load reports</p>
      </div>
    );
  }

  const { overview, layer_distribution, permaculture_functions, harvest_summary, task_stats, crop_plans } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/canvas?farm=${farmId}&section=farm`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{farmName}</h1>
            <p className="text-sm text-muted-foreground">Farm Reports</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {[
            { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { key: 'diversity' as const, label: 'Diversity', icon: Leaf },
            { key: 'harvest' as const, label: 'Harvest', icon: Package },
            { key: 'progress' as const, label: 'Progress', icon: TrendingUp },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="gap-1.5 text-xs shrink-0"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Total Plantings"
                value={overview.total_plantings}
                icon={<Sprout className="h-5 w-5 text-green-600" />}
              />
              <MetricCard
                label="Unique Species"
                value={overview.unique_species}
                icon={<Leaf className="h-5 w-5 text-emerald-600" />}
              />
              <MetricCard
                label="Native %"
                value={`${overview.native_percentage}%`}
                icon={<Shield className="h-5 w-5 text-blue-600" />}
                sublabel={overview.native_percentage >= 70 ? 'Great!' : 'Aim for 70%+'}
              />
              <MetricCard
                label="Zones"
                value={overview.zone_count}
                icon={<Map className="h-5 w-5 text-purple-600" />}
              />
            </div>

            {/* Task Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Task Overview</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Completion rate</span>
                      <span className="font-medium">
                        {task_stats.completed + task_stats.pending + task_stats.in_progress > 0
                          ? Math.round((task_stats.completed / (task_stats.completed + task_stats.pending + task_stats.in_progress)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${task_stats.completed + task_stats.pending + task_stats.in_progress > 0
                            ? (task_stats.completed / (task_stats.completed + task_stats.pending + task_stats.in_progress)) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" />{task_stats.pending} pending</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{task_stats.in_progress} active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{task_stats.completed} done</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Crop Plans */}
            {crop_plans && crop_plans.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Active Crop Plans</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {crop_plans.map((plan: any) => (
                    <div key={plan.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{plan.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{plan.season} {plan.year}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plan.completed_items}/{plan.total_items} crops done
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Diversity Tab */}
        {activeTab === 'diversity' && (
          <div className="space-y-4">
            {/* Layer Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Species by Layer</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {layer_distribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No plantings yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {layer_distribution.map((layer: any) => {
                      const config = LAYER_CONFIG[layer.layer] || { label: layer.layer, color: 'bg-gray-400', icon: Leaf };
                      const maxCount = Math.max(...layer_distribution.map((l: any) => l.count));
                      const pct = (layer.count / maxCount) * 100;
                      return (
                        <div key={layer.layer} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 text-right">{config.label}</span>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                            <div
                              className={`h-full ${config.color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            >
                              <span className="text-[10px] font-bold text-white">{layer.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permaculture Functions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Permaculture Functions</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {permaculture_functions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No functions tracked yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {permaculture_functions.map((fn: any) => {
                      const Icon = FUNCTION_ICONS[fn.name.toLowerCase()] || Leaf;
                      return (
                        <Badge key={fn.name} variant="secondary" className="gap-1 py-1 px-2.5">
                          <Icon className="h-3 w-3" />
                          <span className="capitalize">{fn.name}</span>
                          <span className="text-muted-foreground ml-0.5">({fn.count})</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Native Species */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Native Species Ratio</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${overview.native_percentage}, 100`}
                        className="text-green-500"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {overview.native_percentage}%
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {overview.native_percentage >= 70 ? 'Excellent native ratio!' : overview.native_percentage >= 40 ? 'Good start — aim for 70%' : 'Consider adding more native species'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Native species support local ecosystems and require less maintenance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Harvest Tab */}
        {activeTab === 'harvest' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Harvest Log</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {harvest_summary.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No harvests recorded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Log your first harvest from the crop plan</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {harvest_summary.map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="text-sm font-medium">{h.month}</span>
                          <span className="text-xs text-muted-foreground ml-2">{h.harvest_count} harvests</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{Math.round(h.total_quantity * 10) / 10} {h.unit}</span>
                          {h.avg_quality && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {'★'.repeat(Math.round(h.avg_quality))}{'☆'.repeat(5 - Math.round(h.avg_quality))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Farm Health Score</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <FarmHealthScore overview={overview} taskStats={task_stats} functionCount={permaculture_functions.length} />
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/farm/${farmId}/tasks`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Manage Tasks</p>
                    <p className="text-xs text-muted-foreground">{task_stats.pending} pending</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/farm/${farmId}/plan`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <Sprout className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Crop Plans</p>
                    <p className="text-xs text-muted-foreground">{crop_plans?.length || 0} plans</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, sublabel }: { label: string; value: string | number; icon: React.ReactNode; sublabel?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            {sublabel && <p className="text-[10px] text-green-600 mt-0.5">{sublabel}</p>}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function FarmHealthScore({ overview, taskStats, functionCount }: { overview: any; taskStats: any; functionCount: number }) {
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
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="currentColor" strokeWidth="3" className="text-muted"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${scores.total}, 100`}
              className={scoreColor}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor}`}>
            {scores.total}
          </span>
        </div>
        <div>
          <p className={`text-lg font-semibold ${scoreColor}`}>{scoreLabel}</p>
          <p className="text-xs text-muted-foreground">Based on diversity, native ratio, functions, and task completion</p>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Species Diversity', score: scores.diversityScore, max: 25 },
          { label: 'Native Ratio', score: scores.nativeScore, max: 25 },
          { label: 'Permaculture Functions', score: scores.functionScore, max: 25 },
          { label: 'Task Completion', score: scores.taskScore, max: 25 },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-36">{item.label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(item.score / item.max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8 text-right">{Math.round(item.score)}/{item.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
