'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Globe, QrCode, Eye, Save, Loader2, Copy, ExternalLink,
} from 'lucide-react';
import type { TourConfig } from '@/lib/db/schema';

export function TourAdminOverview() {
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [config, setConfig] = useState<Partial<TourConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayStats, setTodayStats] = useState<any>(null);

  // Fetch user's farms
  useEffect(() => {
    fetch('/api/farms')
      .then(r => r.json())
      .then(data => {
        setFarms(data.farms || []);
        if (data.farms?.length > 0) {
          setSelectedFarmId(data.farms[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch tour config when farm changes
  useEffect(() => {
    if (!selectedFarmId) return;

    Promise.all([
      fetch(`/api/admin/tour/config?farm_id=${selectedFarmId}`).then(r => r.json()),
      fetch(`/api/admin/tour/analytics?farm_id=${selectedFarmId}`).then(r => r.json()),
    ]).then(([configData, analyticsData]) => {
      if (configData.config) {
        setConfig(configData.config);
      } else {
        // Initialize default config
        const farm = farms.find(f => f.id === selectedFarmId);
        const slug = farm?.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 60) || '';
        setConfig({ slug, published: 0, primary_color: '#16a34a' });
      }
      setTodayStats(analyticsData.analytics || null);
    }).catch(console.error);
  }, [selectedFarmId, farms]);

  const saveConfig = async () => {
    if (!selectedFarmId) return;
    setSaving(true);
    try {
      await fetch('/api/admin/tour/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          ...config,
        }),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const tourUrl = config.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/tour/${config.slug}`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Farms</CardTitle>
          <CardDescription>Create a farm first to set up a tour.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Farm selector */}
      {farms.length > 1 && (
        <div>
          <Label>Select Farm</Label>
          <select
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tour Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Tour Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tour URL Slug</Label>
              <Input
                value={config.slug || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="my-farm-tour"
              />
              {tourUrl && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground truncate">{tourUrl}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => navigator.clipboard.writeText(tourUrl)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Published</Label>
                <p className="text-xs text-muted-foreground">Make tour publicly accessible</p>
              </div>
              <Switch
                checked={config.published === 1}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, published: checked ? 1 : 0 }))}
              />
            </div>

            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={config.primary_color || '#16a34a'}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={config.primary_color || '#16a34a'}
                  onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>AI System Prompt (Optional)</Label>
              <Textarea
                value={config.ai_system_prompt || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, ai_system_prompt: e.target.value }))}
                placeholder="Additional context for the AI tour guide (e.g., farm history, special notes)"
                rows={4}
              />
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tour Status</span>
                <Badge variant={config.published === 1 ? 'default' : 'secondary'}>
                  {config.published === 1 ? 'Live' : 'Draft'}
                </Badge>
              </div>
              {config.published === 1 && tourUrl && (
                <div className="mt-3">
                  <a
                    href={tourUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Tour
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's stats */}
          {todayStats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tour Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{todayStats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{todayStats.avgPoisVisited}</p>
                    <p className="text-xs text-muted-foreground">Avg POIs Visited</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{todayStats.shareRate}%</p>
                    <p className="text-xs text-muted-foreground">Share Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{todayStats.totalShares}</p>
                    <p className="text-xs text-muted-foreground">Total Shares</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
