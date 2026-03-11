'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Copy,
  ExternalLink,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Save,
  Settings,
} from 'lucide-react';
import type { FarmTour, TourStop } from '@/lib/db/schema';
import { TourStopEditor } from './tour-stop-editor';

interface TourEditorProps {
  farmId: string;
  tourId: string;
  onBack: () => void;
  onViewAnalytics: () => void;
}

export function TourEditor({ farmId, tourId, onBack, onViewAnalytics }: TourEditorProps) {
  const [tour, setTour] = useState<FarmTour | null>(null);
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [addingStop, setAddingStop] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tour settings form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchTour = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/tours/${tourId}`);
      if (res.ok) {
        const data = await res.json();
        setTour(data.tour);
        setStops(data.stops);
        setTitle(data.tour.title);
        setDescription(data.tour.description || '');
      }
    } catch (err) {
      console.error('Failed to fetch tour:', err);
    } finally {
      setLoading(false);
    }
  }, [farmId, tourId]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTour(updated);
        setShowSettings(false);
      }
    } catch {
      alert('Failed to save');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePublish = async () => {
    if (!tour) return;
    if (stops.length === 0) {
      alert('Add at least one stop before publishing');
      return;
    }
    const newStatus = tour.status === 'published' ? 'draft' : 'published';
    setPublishing(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTour(updated);
      }
    } catch {
      alert('Failed to update status');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm('Delete this stop?')) return;
    try {
      await fetch(`/api/farms/${farmId}/tours/${tourId}/stops/${stopId}`, { method: 'DELETE' });
      fetchTour();
    } catch {
      alert('Failed to delete stop');
    }
  };

  const handleMoveStop = async (stopId: string, direction: 'up' | 'down') => {
    const idx = stops.findIndex(s => s.id === stopId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= stops.length) return;

    const newOrder = [...stops];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setStops(newOrder);

    try {
      await fetch(`/api/farms/${farmId}/tours/${tourId}/stops/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop_ids: newOrder.map(s => s.id) }),
      });
    } catch {
      fetchTour(); // revert
    }
  };

  const handleCopyLink = () => {
    if (!tour?.share_slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/tour/${tour.share_slug}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStopSaved = () => {
    setEditingStopId(null);
    setAddingStop(false);
    fetchTour();
  };

  if (loading || !tour) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show stop editor inline
  if (addingStop) {
    return (
      <TourStopEditor
        farmId={farmId}
        tourId={tourId}
        stopId={null}
        onSaved={handleStopSaved}
        onCancel={() => setAddingStop(false)}
      />
    );
  }

  if (editingStopId) {
    return (
      <TourStopEditor
        farmId={farmId}
        tourId={tourId}
        stopId={editingStopId}
        onSaved={handleStopSaved}
        onCancel={() => setEditingStopId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight truncate">{tour.title}</h2>
              <StatusBadge status={tour.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
              {tour.estimated_duration_minutes ? ` · ${tour.estimated_duration_minutes} min` : ''}
              {tour.visitor_count > 0 ? ` · ${tour.visitor_count} visitors` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
          {tour.visitor_count > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onViewAnalytics}>
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </Button>
          )}
          <Button
            variant={tour.status === 'published' ? 'outline' : 'default'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {tour.status === 'published' ? 'Unpublish' : 'Publish Tour'}
          </Button>
        </div>
      </div>

      {/* Share Link (shown when published) */}
      {tour.status === 'published' && tour.share_slug && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-sm text-green-800 dark:text-green-300 flex-1 truncate">
            {window.location.origin}/tour/{tour.share_slug}
          </span>
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" />
            {copiedLink ? 'Copied!' : 'Copy'}
          </Button>
          <a href={`/tour/${tour.share_slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </Button>
          </a>
        </div>
      )}

      {/* Settings Collapse */}
      {showSettings && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="space-y-2">
            <Label>Tour Name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Stops List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Tour Stops
          </h3>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAddingStop(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Stop
          </Button>
        </div>

        {stops.length === 0 ? (
          <div className="text-center py-10 px-4 border rounded-xl border-dashed">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
            <h4 className="font-medium mb-1">No stops yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add stops to mark interesting points along the tour
            </p>
            <Button size="sm" onClick={() => setAddingStop(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add First Stop
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {stops.map((stop, idx) => (
              <div
                key={stop.id}
                className="border rounded-lg p-3 bg-card flex items-center gap-3 group hover:shadow-sm transition-shadow"
              >
                {/* Order Number */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleMoveStop(stop.id, 'up')}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleMoveStop(stop.id, 'down')}
                    disabled={idx === stops.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Stop Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{stop.title}</p>
                    {stop.is_optional === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        optional
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{stop.stop_type.replace(/_/g, ' ')}</span>
                    {stop.lat && stop.lng && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        Located
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {stop.estimated_time_minutes} min
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingStopId(stop.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteStop(stop.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish CTA at bottom */}
      {stops.length > 0 && tour.status === 'draft' && (
        <div className="border rounded-lg p-4 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Ready to share?</p>
            <p className="text-xs text-muted-foreground">
              Publish your tour to generate a shareable link for visitors
            </p>
          </div>
          <Button onClick={handlePublish} disabled={publishing} className="gap-1.5">
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish Tour
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${variants[status] || variants.draft}`}>
      {status}
    </span>
  );
}
