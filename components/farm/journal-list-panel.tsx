'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, BookOpen, Cloud, Tag, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        <div className="text-center py-12 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">No journal entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Track observations, weather, harvests, and wildlife sightings.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log your first observation
          </Button>
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
              <JournalEntryCard key={entry.id} entry={entry} />
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
    </div>
  );
}

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
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
    <div className="rounded-xl border border-border bg-card p-3 space-y-2 hover:bg-accent/30 transition-colors">
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
    </div>
  );
}
