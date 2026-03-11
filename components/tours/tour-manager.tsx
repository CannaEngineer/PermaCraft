'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Map,
  Clock,
  Users,
  BarChart3,
  Eye,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Footprints,
  Monitor,
  Share2,
  Route,
} from 'lucide-react';
import Link from 'next/link';
import type { FarmTour } from '@/lib/db/schema';
import { TourCreator } from './tour-creator';
import { TourEditor } from './tour-editor';
import { TourAnalytics } from './tour-analytics';

interface TourManagerProps {
  farmId: string;
  farmName: string;
}

type View = 'list' | 'create' | 'edit' | 'analytics';

export function TourManager({ farmId, farmName }: TourManagerProps) {
  const [tours, setTours] = useState<(FarmTour & { stop_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchTours = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/tours`);
      if (res.ok) {
        const data = await res.json();
        setTours(data.tours);
      }
    } catch (err) {
      console.error('Failed to fetch tours:', err);
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const handleDelete = async (tourId: string) => {
    if (!confirm('Delete this tour? This cannot be undone.')) return;
    setDeleting(tourId);
    try {
      await fetch(`/api/farms/${farmId}/tours/${tourId}`, { method: 'DELETE' });
      setTours(prev => prev.filter(t => t.id !== tourId));
    } catch {
      alert('Failed to delete tour');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/tour/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleTogglePublish = async (tour: FarmTour) => {
    const newStatus = tour.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/farms/${farmId}/tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTours();
      }
    } catch {
      alert('Failed to update tour status');
    }
  };

  const handleTourCreated = (tour: FarmTour) => {
    setSelectedTourId(tour.id);
    setView('edit');
    fetchTours();
  };

  const handleBack = () => {
    setView('list');
    setSelectedTourId(null);
    fetchTours();
  };

  if (view === 'create') {
    return (
      <TourCreator
        farmId={farmId}
        onCreated={handleTourCreated}
        onCancel={handleBack}
      />
    );
  }

  if (view === 'edit' && selectedTourId) {
    return (
      <TourEditor
        farmId={farmId}
        tourId={selectedTourId}
        onBack={handleBack}
        onViewAnalytics={() => setView('analytics')}
      />
    );
  }

  if (view === 'analytics' && selectedTourId) {
    return (
      <TourAnalytics
        farmId={farmId}
        tourId={selectedTourId}
        onBack={() => setView('edit')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Farm Tours</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create self-guided tours for visitors to explore {farmName}
          </p>
        </div>
        <Button onClick={() => setView('create')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Tour
        </Button>
      </div>

      {/* Tour List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tours.length === 0 ? (
        <EmptyState onCreateTour={() => setView('create')} />
      ) : (
        <div className="grid gap-4">
          {tours.map(tour => (
            <div
              key={tour.id}
              className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{tour.title}</h3>
                    <StatusBadge status={tour.status} />
                    <TourTypeBadge tourType={(tour as any).tour_type || 'in_person'} />
                    <AccessBadge accessType={tour.access_type} />
                  </div>
                  {tour.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {tour.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Map className="h-3.5 w-3.5" />
                      {tour.stop_count} {tour.stop_count === 1 ? 'stop' : 'stops'}
                    </span>
                    {tour.estimated_duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {tour.estimated_duration_minutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {tour.visitor_count} {tour.visitor_count === 1 ? 'visitor' : 'visitors'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {tour.status === 'published' && tour.share_slug && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(tour.share_slug!)}
                        title="Copy share link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Link href={`/tour/${tour.share_slug}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview tour">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  )}
                  {tour.visitor_count > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setSelectedTourId(tour.id); setView('analytics'); }}
                      title="View analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setSelectedTourId(tour.id); setView('edit'); }}
                    title="Edit tour"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(tour.id)}
                    disabled={deleting === tour.id}
                    title="Delete tour"
                  >
                    {deleting === tour.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {copiedSlug === tour.share_slug && (
                <p className="text-xs text-green-600 mt-2">Link copied to clipboard</p>
              )}

              {/* Quick Actions Row */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => { setSelectedTourId(tour.id); setView('edit'); }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit Stops
                </Button>
                <Button
                  variant={tour.status === 'published' ? 'outline' : 'default'}
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => handleTogglePublish(tour)}
                >
                  <Eye className="h-3 w-3" />
                  {tour.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
                {tour.visitor_count > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => { setSelectedTourId(tour.id); setView('analytics'); }}
                  >
                    <BarChart3 className="h-3 w-3" />
                    Analytics
                  </Button>
                )}
              </div>
            </div>
          ))}
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

function AccessBadge({ accessType }: { accessType: string }) {
  if (accessType === 'public') return null;
  const labels: Record<string, string> = {
    link_only: 'Link Only',
    password: 'Password',
  };
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
      {labels[accessType] || accessType}
    </span>
  );
}

function TourTypeBadge({ tourType }: { tourType: string }) {
  const isVirtual = tourType === 'virtual';
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
      isVirtual
        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    }`}>
      {isVirtual ? <Monitor className="h-2.5 w-2.5" /> : <Route className="h-2.5 w-2.5" />}
      {isVirtual ? 'Virtual' : 'In-Person'}
    </span>
  );
}

function EmptyState({ onCreateTour }: { onCreateTour: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <Footprints className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No tours yet</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
        Create a self-guided tour to let visitors explore your farm at their own pace.
        Add stops, descriptions, photos, and map locations — then share a link.
      </p>
      <Button onClick={onCreateTour} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Tour
      </Button>
    </div>
  );
}
