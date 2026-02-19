'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PanelHeader } from './panel-header';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { Search, Leaf, Loader2, X } from 'lucide-react';
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
  const { activeFarmId } = useUnifiedCanvas();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeLayer) params.set('layer', activeLayer);
      if (activeFilter) params.set('filter', activeFilter);

      const res = await fetch(`/api/species?${params.toString()}`);
      const data = await res.json();
      setSpecies(data.species || []);
    } catch (e) {
      console.error('Failed to fetch species:', e);
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

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Plants" subtitle={`${species.length} species`} />
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search species..."
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-accent/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
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
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeLayer === layer
                  ? layerColors[layer]
                  : 'bg-accent/50 text-muted-foreground hover:bg-accent'
              }`}
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
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeFilter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/50 text-muted-foreground hover:bg-accent'
              }`}
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
          ) : species.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Leaf className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No species found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {species.slice(0, 50).map((sp) => (
                <SpeciesRow key={sp.id} species={sp} farmId={activeFarmId} />
              ))}
              {species.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Showing 50 of {species.length} results. Refine your search.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpeciesRow({ species, farmId }: { species: Species; farmId: string | null }) {
  const functions = species.permaculture_functions
    ? JSON.parse(species.permaculture_functions).slice(0, 2)
    : [];

  return (
    <div className="px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{species.common_name}</p>
          <p className="text-xs text-muted-foreground italic truncate">{species.scientific_name}</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          layerColors[species.layer] || 'bg-gray-500 text-white'
        }`}>
          {species.layer}
        </span>
      </div>
      {functions.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {functions.map((fn: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-accent/50 text-[10px] text-muted-foreground">
              {fn.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
      {species.is_native ? (
        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-[10px] text-green-700 dark:text-green-300 font-medium">
          Native
        </span>
      ) : null}
    </div>
  );
}
