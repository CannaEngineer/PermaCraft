'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SpeciesCard } from '@/components/species/species-card';
import { SpeciesFilterSidebar } from '@/components/species/species-filter-sidebar';
import type { Species } from '@/lib/db/schema';
import { Search, SlidersHorizontal, X, Leaf, Sparkles } from 'lucide-react';
import { Drawer } from 'vaul';

export default function PlantsPage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [nativeFilter, setNativeFilter] = useState<'all' | 'native' | 'naturalized'>('all');
  const [layerFilter, setLayerFilter] = useState<string[]>([]);
  const [functionFilter, setFunctionFilter] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSpecies();
  }, [nativeFilter]);

  const fetchSpecies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nativeFilter !== 'all') {
        params.set('filter', nativeFilter);
      }

      const response = await fetch(`/api/species?${params}`);
      const data = await response.json();
      setSpecies(data.species || []);
    } catch (error) {
      console.error('Failed to fetch species:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecies = species.filter(s => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        s.common_name.toLowerCase().includes(query) ||
        s.scientific_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Layer filter
    if (layerFilter.length > 0 && !layerFilter.includes(s.layer)) {
      return false;
    }

    // Function filter
    if (functionFilter.length > 0) {
      const speciesFunctions = s.permaculture_functions
        ? JSON.parse(s.permaculture_functions)
        : [];
      const hasFunction = functionFilter.some(fn => speciesFunctions.includes(fn));
      if (!hasFunction) return false;
    }

    return true;
  });

  // Count active filters for mobile badge
  const activeFilterCount =
    (nativeFilter !== 'all' ? 1 : 0) +
    layerFilter.length +
    functionFilter.length;

  const clearAllFilters = () => {
    setNativeFilter('all');
    setLayerFilter([]);
    setFunctionFilter([]);
    setSearchQuery('');
  };

  const removeLayerFilter = (layer: string) => {
    setLayerFilter(layerFilter.filter(l => l !== layer));
  };

  const removeFunctionFilter = (fn: string) => {
    setFunctionFilter(functionFilter.filter(f => f !== fn));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <Leaf className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold">
                  Plant Catalog
                </h1>
                <p className="text-sm text-muted-foreground">
                  {filteredSpecies.length} species available
                </p>
              </div>
            </div>

            {/* Quick Native Filter Buttons - Desktop */}
            <div className="hidden md:flex gap-2 animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '100ms' }}>
              <Button
                variant={nativeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNativeFilter('all')}
                className="rounded-xl"
              >
                All Plants
              </Button>
              <Button
                variant={nativeFilter === 'native' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNativeFilter('native')}
                className={`rounded-xl ${nativeFilter === 'native' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                Native Only
              </Button>
              <Button
                variant={nativeFilter === 'naturalized' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNativeFilter('naturalized')}
                className="rounded-xl"
              >
                Non-Native
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search plants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <Button
              variant="outline"
              size="default"
              className="flex-shrink-0 relative h-11 rounded-xl"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms' }}>
              {nativeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-2 rounded-lg">
                  {nativeFilter === 'native' ? 'Native Only' : 'Non-Native'}
                  <button
                    onClick={() => setNativeFilter('all')}
                    className="hover:bg-background/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {layerFilter.map(layer => (
                <Badge key={layer} variant="secondary" className="gap-2 capitalize rounded-lg">
                  Layer: {layer}
                  <button
                    onClick={() => removeLayerFilter(layer)}
                    className="hover:bg-background/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {functionFilter.map(fn => (
                <Badge key={fn} variant="secondary" className="gap-2 rounded-lg">
                  {fn.replace(/_/g, ' ')}
                  <button
                    onClick={() => removeFunctionFilter(fn)}
                    className="hover:bg-background/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 text-xs rounded-lg"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-muted-foreground">Loading plants...</p>
          </div>
        ) : filteredSpecies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No plants found</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Try adjusting your filters or search query
            </p>
            <Button onClick={clearAllFilters} variant="outline" className="rounded-xl">
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {filteredSpecies.map((s, index) => (
                <div
                  key={s.id}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                  style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
                >
                  <SpeciesCard
                    species={s}
                    onClick={() => router.push(`/plants/${s.id}`)}
                  />
                </div>
              ))}
            </div>

            {/* Load More Hint */}
            {filteredSpecies.length > 20 && (
              <div className="text-center mt-8 text-sm text-muted-foreground">
                Showing {filteredSpecies.length} species
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer.Root open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-xl h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
            {/* Handle */}
            <div className="flex-shrink-0 p-4 border-b border-border">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Filters</h2>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="rounded-xl"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable Filter Content */}
            <div className="flex-1 overflow-y-auto">
              <SpeciesFilterSidebar
                nativeFilter={nativeFilter}
                onNativeFilterChange={setNativeFilter}
                layerFilter={layerFilter}
                onLayerFilterChange={setLayerFilter}
                functionFilter={functionFilter}
                onFunctionFilterChange={setFunctionFilter}
              />
            </div>

            {/* Apply Button Footer */}
            <div className="flex-shrink-0 p-4 border-t border-border">
              <Button
                className="w-full h-12 rounded-xl"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {filteredSpecies.length} Results
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </div>
  );
}
