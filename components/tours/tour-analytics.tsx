'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle2,
  Star,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  MessageSquare,
} from 'lucide-react';

interface AnalyticsData {
  total_visits: number;
  period_visits: number;
  completion_rate: number;
  avg_rating: number | null;
  rating_count: number;
  daily_visits: { visit_date: string; count: number }[];
  device_breakdown: { device_type: string; count: number }[];
  recent_feedback: {
    visitor_name: string | null;
    rating: number | null;
    feedback: string;
    completed_at: number | null;
    started_at: number;
  }[];
  stop_popularity: Record<string, number>;
  period_days: number;
}

interface TourAnalyticsProps {
  farmId: string;
  tourId: string;
  onBack: () => void;
}

export function TourAnalytics({ farmId, tourId, onBack }: TourAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tours/${tourId}/analytics?days=${days}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [farmId, tourId, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxDailyCount = Math.max(...data.daily_visits.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight">Tour Analytics</h2>
        </div>
        <div className="flex items-center gap-1">
          {[7, 30, 90].map(d => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'ghost'}
              size="sm"
              className="text-xs px-3"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Visitors"
          value={data.total_visits.toString()}
          subtext={`${data.period_visits} in last ${data.period_days}d`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completion Rate"
          value={`${data.completion_rate}%`}
          subtext="finished the tour"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={data.avg_rating ? `${data.avg_rating}/5` : '—'}
          subtext={data.rating_count > 0 ? `${data.rating_count} ratings` : 'No ratings yet'}
        />
        <StatCard
          icon={TrendingUp}
          label={`Last ${data.period_days} Days`}
          value={data.period_visits.toString()}
          subtext="visits"
        />
      </div>

      {/* Daily Visits Chart */}
      {data.daily_visits.length > 0 && (
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Daily Visits</h3>
          <div className="flex items-end gap-1 h-32">
            {data.daily_visits.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                  style={{ height: `${(day.count / maxDailyCount) * 100}%` }}
                  title={`${day.visit_date}: ${day.count} visits`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{data.daily_visits[0]?.visit_date}</span>
            <span>{data.daily_visits[data.daily_visits.length - 1]?.visit_date}</span>
          </div>
        </div>
      )}

      {/* Device Breakdown */}
      {data.device_breakdown.length > 0 && (
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Devices</h3>
          <div className="space-y-2">
            {data.device_breakdown.map((device) => {
              const Icon = device.device_type === 'mobile' ? Smartphone
                : device.device_type === 'tablet' ? Tablet : Monitor;
              const total = data.device_breakdown.reduce((s, d) => s + d.count, 0);
              const pct = Math.round((device.count / total) * 100);
              return (
                <div key={device.device_type} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm capitalize w-20">{device.device_type}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Feedback */}
      {data.recent_feedback.length > 0 && (
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Visitor Feedback
          </h3>
          <div className="space-y-3">
            {data.recent_feedback.map((fb, i) => (
              <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {fb.visitor_name || 'Anonymous Visitor'}
                  </span>
                  {fb.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-current" />
                      {fb.rating}/5
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(fb.started_at * 1000).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{fb.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no visits */}
      {data.total_visits === 0 && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-medium mb-1">No visitors yet</h3>
          <p className="text-sm text-muted-foreground">
            Share your tour link to start seeing analytics here
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}
