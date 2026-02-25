'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, BookOpen, Cloud, Tag, ChevronDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { JournalEntryForm } from './journal-entry-form';
import type { JournalEntry } from '@/lib/db/schema';

interface JournalListPanelProps {
  farmId: string;
}

interface GroupedEntries {
  label: string;
  entries: JournalEntry[];
}

function groupByMonth(entries: JournalEntry[]): GroupedEntries[] {
  const groups = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.entry_date * 1000);
    const key = format(date, 'MMMM yyyy');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries()).map(([label, entries]) => ({
    label,
    entries,
  }));
}

export function JournalListPanel({ farmId }: JournalListPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);

  const fetchEntries = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(
        `/api/journal/entries?farm_id=${farmId}&page=${pageNum}&limit=20`
      );
      if (!res.ok) throw new Error('Failed to fetch entries');

      const data = await res.json();
      setEntries(prev => append ? [...prev, ...data.entries] : data.entries);
      setHasMore(data.hasMore);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [farmId]);

  useEffect(() => {
    setPage(1);
    fetchEntries(1);
  }, [farmId, fetchEntries]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntries(nextPage, true);
  };

  const handleEntryCreated = () => {
    setPage(1);
    fetchEntries(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = groupByMonth(entries);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold">Farm Journal</h2>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Entry
        </Button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto">
            <BookOpen className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold">Start Your Farm Journal</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[260px] mx-auto">
              Record observations, weather, harvests, and wildlife sightings to track your farm's progress over time.
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="h-4 w-4" />
            Write Your First Entry
          </Button>
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {['Weather', 'Harvest', 'Wildlife', 'Soil', 'Planting'].map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal text-muted-foreground border-amber-200 dark:border-amber-800">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Timeline list grouped by month */}
      {grouped.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onClick={() => setDetailEntry(entry)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Load more
          </Button>
        </div>
      )}

      {/* New entry dialog */}
      <JournalEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        farmId={farmId}
        onEntryCreated={handleEntryCreated}
      />

      {/* Detail dialog */}
      <JournalEntryDetail
        entry={detailEntry}
        onClose={() => setDetailEntry(null)}
      />
    </div>
  );
}

function JournalEntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const date = new Date(entry.entry_date * 1000);
  let tags: string[] = [];
  if (entry.tags) {
    try { tags = JSON.parse(entry.tags); } catch { /* malformed */ }
  }

  // Truncate content for preview
  const preview = entry.content.length > 160
    ? entry.content.slice(0, 160) + '...'
    : entry.content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-3 space-y-2 hover:bg-accent/30 transition-colors cursor-pointer"
    >
      {/* Date and weather row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {format(date, 'MMM d, yyyy')}
        </span>
        {entry.weather && (
          <Badge variant="secondary" className="text-xs gap-1 font-normal">
            <Cloud className="h-3 w-3" />
            {entry.weather}
          </Badge>
        )}
      </div>

      {/* Title */}
      {entry.title && (
        <p className="text-sm font-medium leading-tight">{entry.title}</p>
      )}

      {/* Content preview */}
      <p className="text-sm text-muted-foreground leading-relaxed">{preview}</p>

      {/* Media thumbnails */}
      {entry.media_urls && (() => {
        try {
          const urls: string[] = JSON.parse(entry.media_urls);
          if (urls.length > 0) {
            return (
              <div className="flex gap-1.5 overflow-hidden">
                {urls.slice(0, 3).map((url, i) => (
                  <div key={i} className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {urls.length > 3 && (
                  <div className="h-16 w-16 flex-shrink-0 rounded-md border flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">+{urls.length - 3}</span>
                  </div>
                )}
              </div>
            );
          }
        } catch { /* malformed */ }
        return null;
      })()}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs capitalize gap-1 font-normal"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}

function JournalEntryDetail({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  if (!entry) return null;

  const date = new Date(entry.entry_date * 1000);
  let tags: string[] = [];
  if (entry.tags) {
    try { tags = JSON.parse(entry.tags); } catch { /* malformed */ }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry.title || format(date, 'MMMM d, yyyy')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
            {entry.weather && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Cloud className="h-3 w-3" />
                {entry.weather}
              </Badge>
            )}
            {entry.is_shared_to_community === 1 && (
              <Badge variant="outline" className="gap-1 font-normal">
                <Share2 className="h-3 w-3" />
                Shared
              </Badge>
            )}
          </div>

          <Separator />

          {/* Full content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </div>

          {/* Media */}
          {entry.media_urls && (() => {
            try {
              const urls: string[] = JSON.parse(entry.media_urls);
              if (urls.length > 0) {
                return (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                           className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </>
                );
              }
            } catch { /* malformed */ }
            return null;
          })()}

          {/* Tags */}
          {tags.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="capitalize gap-1 font-normal"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
