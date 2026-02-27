'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PanelHeader } from './panel-header';
import { Search, Leaf, Loader2, X, ArrowRight, AlertCircle, Plus, MapPin, Sparkles } from 'lucide-react';
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

interface FarmInfo {
  climate_zone: string | null;
  region: string;
  region_name: string;
}

interface NativeData {
  perfect_match: Species[];
  good_match: Species[];
  possible: Species[];
  farm_info: FarmInfo | null;
}

interface PlantsPanelProps {
  onSelectSpecies?: (species: Species) => void;
  farmId?: string;
}

export function PlantsPanel({ onSelectSpecies, farmId }: PlantsPanelProps) {
  // "All Species" tab state
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // "Recommended" tab state
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>(farmId ? 'recommended' : 'all');
  const [nativeData, setNativeData] = useState<NativeData | null>(null);
  const [nativeLoading, setNativeLoading] = useState(false);
  const [nativeError, setNativeError] = useState(false);
  const [detectingZone, setDetectingZone] = useState(false);

  // Fetch all species (for "All" tab)
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

  // Fetch native species recommendations (for "Recommended" tab)
  const fetchNativeSpecies = useCallback(async () => {
    if (!farmId) return;
    setNativeLoading(true);
    setNativeError(false);
    try {
      const res = await fetch(`/api/farms/${farmId}/native-species`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNativeData({
        perfect_match: data.perfect_match || [],
        good_match: data.good_match || [],
        possible: data.possible || [],
        farm_info: data.farm_info || null,
      });
    } catch (e) {
      console.error('Failed to fetch native species:', e);
      setNativeError(true);
    } finally {
      setNativeLoading(false);
    }
  }, [farmId]);

  // Debounced fetch for all species
  useEffect(() => {
    if (activeTab !== 'all') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchSpecies, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchSpecies, activeTab]);

  // Fetch native species on mount when farmId present
  useEffect(() => {
    if (farmId) fetchNativeSpecies();
  }, [farmId, fetchNativeSpecies]);

  // Detect zone for farms missing climate_zone
  const handleDetectZone = async () => {
    setDetectingZone(true);
    try {
      const res = await fetch('/api/farms/backfill-zones', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to detect zone');
      // Refetch native species after backfill
      await fetchNativeSpecies();
    } catch (e) {
      console.error('Zone detection failed:', e);
    } finally {
      setDetectingZone(false);
    }
  };

  // Filter recommended species by search and layer
  const getFilteredRecommended = (list: Species[]) => {
    let filtered = list;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.common_name.toLowerCase().includes(q) ||
        s.scientific_name.toLowerCase().includes(q)
      );
    }
    if (activeLayer) {
      filtered = filtered.filter(s => s.layer === activeLayer);
    }
    return filtered;
  };

  const farmInfo = nativeData?.farm_info;
  const hasZone = farmInfo?.climate_zone != null;

  const subtitle = activeTab === 'recommended'
    ? nativeLoading ? 'Searching...' : nativeError ? 'Error loading' : (
        hasZone
          ? `Zone ${farmInfo!.climate_zone} recommendations`
          : 'Set up zone for recommendations'
      )
    : loading ? 'Searching...' : error ? 'Error loading' : `${species.length} species`;

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Plants" subtitle={subtitle} />

      {/* Tab bar */}
      {farmId && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'recommended'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Species
          </button>
        </div>
      )}

      {/* Zone badge (when on recommended tab and zone is known) */}
      {activeTab === 'recommended' && farmInfo && hasZone && (
        <div className="px-4 pt-3 pb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium">
            <MapPin className="h-3 w-3" />
            Zone {farmInfo.climate_zone} &middot; {farmInfo.region_name}
          </div>
        </div>
      )}

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

      {/* Native/all filter (only for "All Species" tab) */}
      {activeTab === 'all' && (
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
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'recommended' ? (
          // Recommended tab
          <RecommendedContent
            nativeData={nativeData}
            loading={nativeLoading}
            error={nativeError}
            hasZone={hasZone}
            detectingZone={detectingZone}
            onDetectZone={handleDetectZone}
            onRetry={fetchNativeSpecies}
            onSelectSpecies={onSelectSpecies}
            search={search}
            activeLayer={activeLayer}
            getFilteredRecommended={getFilteredRecommended}
          />
        ) : (
          // All Species tab (existing behavior)
          <AllSpeciesContent
            species={species}
            loading={loading}
            error={error}
            search={search}
            activeLayer={activeLayer}
            activeFilter={activeFilter}
            onRetry={fetchSpecies}
            onClearFilters={() => { setSearch(''); setActiveLayer(null); setActiveFilter(null); }}
            onSelectSpecies={onSelectSpecies}
          />
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

// ── Recommended Content ─────────────────────────────────────────────────────

interface RecommendedContentProps {
  nativeData: NativeData | null;
  loading: boolean;
  error: boolean;
  hasZone: boolean;
  detectingZone: boolean;
  onDetectZone: () => void;
  onRetry: () => void;
  onSelectSpecies?: (species: Species) => void;
  search: string;
  activeLayer: string | null;
  getFilteredRecommended: (list: Species[]) => Species[];
}

function RecommendedContent({
  nativeData,
  loading,
  error,
  hasZone,
  detectingZone,
  onDetectZone,
  onRetry,
  onSelectSpecies,
  search,
  activeLayer,
  getFilteredRecommended,
}: RecommendedContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <AlertCircle className="h-10 w-10 text-destructive/40 mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Failed to load recommendations</p>
        <button onClick={onRetry} className="text-xs text-primary hover:underline font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (!hasZone) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium mb-1">Hardiness zone not set</p>
        <p className="text-xs text-muted-foreground mb-4">
          Detect your farm&apos;s USDA hardiness zone to get native plant recommendations tailored to your area.
        </p>
        <button
          onClick={onDetectZone}
          disabled={detectingZone}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {detectingZone ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              Detect Zone
            </>
          )}
        </button>
      </div>
    );
  }

  const perfect = getFilteredRecommended(nativeData?.perfect_match || []);
  const good = getFilteredRecommended(nativeData?.good_match || []);
  const possible = getFilteredRecommended(nativeData?.possible || []);
  const totalResults = perfect.length + good.length + possible.length;

  if (totalResults === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Leaf className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No species found</p>
        {(search || activeLayer) && (
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Perfect matches */}
      {perfect.length > 0 && (
        <TierSection
          title="Perfect for Your Farm"
          accent="green"
          species={perfect}
          onSelectSpecies={onSelectSpecies}
        />
      )}

      {/* Good matches */}
      {good.length > 0 && (
        <TierSection
          title="Good Options"
          accent="amber"
          species={good}
          onSelectSpecies={onSelectSpecies}
        />
      )}

      {/* Other compatible */}
      {possible.length > 0 && (
        <TierSection
          title="Other Compatible"
          accent="gray"
          species={possible}
          onSelectSpecies={onSelectSpecies}
        />
      )}
    </div>
  );
}

// ── Tier Section ─────────────────────────────────────────────────────────────

const tierAccentStyles = {
  green: {
    border: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  gray: {
    border: 'border-l-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    text: 'text-gray-600 dark:text-gray-400',
  },
};

function TierSection({
  title,
  accent,
  species,
  onSelectSpecies,
}: {
  title: string;
  accent: 'green' | 'amber' | 'gray';
  species: Species[];
  onSelectSpecies?: (species: Species) => void;
}) {
  const styles = tierAccentStyles[accent];

  return (
    <div className={`border-l-2 ${styles.border} mx-4 mb-4`}>
      <div className={`px-3 py-2 ${styles.bg} rounded-r-lg`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${styles.text}`}>
          {title}
          <span className="ml-1.5 font-normal normal-case tracking-normal">({species.length})</span>
        </h3>
      </div>
      <div className="divide-y divide-border/30">
        {species.slice(0, 20).map((sp) => (
          <SpeciesRow key={sp.id} species={sp} onSelect={onSelectSpecies} />
        ))}
        {species.length > 20 && (
          <p className="text-xs text-muted-foreground text-center py-2 px-3">
            +{species.length - 20} more
          </p>
        )}
      </div>
    </div>
  );
}

// ── All Species Content (existing behavior) ──────────────────────────────────

function AllSpeciesContent({
  species,
  loading,
  error,
  search,
  activeLayer,
  activeFilter,
  onRetry,
  onClearFilters,
  onSelectSpecies,
}: {
  species: Species[];
  loading: boolean;
  error: boolean;
  search: string;
  activeLayer: string | null;
  activeFilter: string | null;
  onRetry: () => void;
  onClearFilters: () => void;
  onSelectSpecies?: (species: Species) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <AlertCircle className="h-10 w-10 text-destructive/40 mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Failed to load species</p>
        <button onClick={onRetry} className="text-xs text-primary hover:underline font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (species.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Leaf className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No species found</p>
        {(search || activeLayer || activeFilter) && (
          <button
            onClick={onClearFilters}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {species.slice(0, 50).map((sp) => (
        <SpeciesRow key={sp.id} species={sp} onSelect={onSelectSpecies} />
      ))}
      {species.length > 50 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          Showing 50 of {species.length} results. Refine your search.
        </p>
      )}
    </div>
  );
}

// ── Species Row ──────────────────────────────────────────────────────────────

function SpeciesRow({ species, onSelect }: { species: Species; onSelect?: (species: Species) => void }) {
  const router = useRouter();
  let functions: string[] = [];
  if (species.permaculture_functions) {
    try {
      const parsed = JSON.parse(species.permaculture_functions);
      functions = Array.isArray(parsed) ? parsed.slice(0, 2) : [];
    } catch { /* malformed data */ }
  }

  return (
    <div
      onClick={() => router.push(`/plants/${species.id}`)}
      className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors group cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/plants/${species.id}`); }}
      aria-label={`View ${species.common_name} details`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{species.common_name}</p>
          <p className="text-xs text-muted-foreground italic truncate">{species.scientific_name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
            layerColors[species.layer] || 'bg-gray-500 text-white'
          }`}>
            {species.layer}
          </span>
          {onSelect && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(species); }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-green-600 hover:bg-green-700 text-white p-0.5"
              aria-label={`Add ${species.common_name} to farm`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
