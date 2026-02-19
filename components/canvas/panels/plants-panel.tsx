'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PanelHeader } from './panel-header';
import { Search, Leaf, Loader2, X, ArrowRight, AlertCircle } from 'lucide-react';
import type { Species } from '@/lib/db/schema';

const LAYERS = ['canopy', 'understory', 'shrub', 'herbaceous', 'groundcover', 'vine', 'root', 'aquatic'] as const;

const layerColors: Record<string, string> = {
  canopy: 'bg-green-700 text-white',
  understory: 'bg-green-600 text-white',
  shrub: 'bg-green-500 text-white',
  herbaceous: 'bg-green-400 text-white',
  groundcover: 'bg-lime-500 text-white',
  vine: 'bg-amber-500 text-white',
  root: 'bg-orange-500 text-white',
  aquatic: 'bg-blue-500 text-white',
};

export function PlantsPanel() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeLayer) params.set('layer', activeLayer);
      if (activeFilter) params.set('filter', activeFilter);

      const res = await fetch(`/api/species?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSpecies(data.species || []);
    } catch (e) {
      console.error('Failed to fetch species:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, activeLayer, activeFilter]);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchSpecies, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchSpecies]);

  const subtitle = loading ? 'Searching...' : error ? 'Error loading' : `${species.length} species`;

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Plants" subtitle={subtitle} />
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search species..."
            className="w-full h-10 pl-9 pr-10 rounded-lg border border-border bg-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Layer filter pills */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {LAYERS.map((layer) => (
          <button
            key={layer}
            onClick={() => setActiveLayer(activeLayer === layer ? null : layer)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
              activeLayer === layer
                ? layerColors[layer]
                : 'bg-accent/50 text-muted-foreground hover:bg-accent'
            }`}
            aria-pressed={activeLayer === layer}
          >
            {layer}
          </button>
        ))}
      </div>

      {/* Native/all toggle */}
      <div className="px-4 pb-2 flex gap-1.5">
        {[
          { id: null, label: 'All' },
          { id: 'native', label: 'Native' },
          { id: 'naturalized', label: 'Naturalized' },
        ].map((f) => (
          <button
            key={f.id ?? 'all'}
            onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
              activeFilter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/50 text-muted-foreground hover:bg-accent'
            }`}
            aria-pressed={activeFilter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Species list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <AlertCircle className="h-10 w-10 text-destructive/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Failed to load species</p>
            <button
              onClick={fetchSpecies}
              className="text-xs text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : species.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Leaf className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No species found</p>
            {(search || activeLayer || activeFilter) && (
              <button
                onClick={() => { setSearch(''); setActiveLayer(null); setActiveFilter(null); }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {species.slice(0, 50).map((sp) => (
              <SpeciesRow key={sp.id} species={sp} />
            ))}
            {species.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Showing 50 of {species.length} results. Refine your search.
              </p>
            )}
          </div>
        )}

        {/* Browse full catalog link */}
        <div className="p-4 border-t border-border/30">
          <a
            href="/plants"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors text-xs font-medium text-primary min-h-[44px]"
          >
            Browse Full Plant Catalog
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function SpeciesRow({ species }: { species: Species }) {
  let functions: string[] = [];
  if (species.permaculture_functions) {
    try {
      const parsed = JSON.parse(species.permaculture_functions);
      functions = Array.isArray(parsed) ? parsed.slice(0, 2) : [];
    } catch { /* malformed data */ }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{species.common_name}</p>
          <p className="text-xs text-muted-foreground italic truncate">{species.scientific_name}</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
          layerColors[species.layer] || 'bg-gray-500 text-white'
        }`}>
          {species.layer}
        </span>
      </div>
      {functions.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {functions.map((fn: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-accent/50 text-xs text-muted-foreground">
              {fn.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
      {species.is_native ? (
        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-xs text-green-700 dark:text-green-300 font-medium">
          Native
        </span>
      ) : null}
    </div>
  );
}
