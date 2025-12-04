'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SpeciesCard } from '@/components/species/species-card';
import { SpeciesFilterSidebar } from '@/components/species/species-filter-sidebar';
import { SpeciesDetailModal } from '@/components/species/species-detail-modal';
import type { Species } from '@/lib/db/schema';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import { FAB } from '@/components/ui/fab';

export default function PlantsPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [nativeFilter, setNativeFilter] = useState<'all' | 'native' | 'naturalized'>('all');
  const [layerFilter, setLayerFilter] = useState<string[]>([]);
  const [functionFilter, setFunctionFilter] = useState<string[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
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

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:block md:w-56 lg:w-64 overflow-y-auto border-r">
        <SpeciesFilterSidebar
          nativeFilter={nativeFilter}
          onNativeFilterChange={setNativeFilter}
          layerFilter={layerFilter}
          onLayerFilterChange={setLayerFilter}
          functionFilter={functionFilter}
          onFunctionFilterChange={setFunctionFilter}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Plant Catalog</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Browse native and naturalized species for your permaculture design
            </p>
          </div>

          {/* Search and Mobile Filter Button */}
          <div className="mb-4 md:mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by common or scientific name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="default"
              className="md:hidden flex-shrink-0 relative"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading species...
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {filteredSpecies.length} species found
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpecies.map(s => (
                  <SpeciesCard
                    key={s.id}
                    species={s}
                    onClick={() => setSelectedSpeciesId(s.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer.Root open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40 md:hidden" />
          <Drawer.Content className="md:hidden bg-card flex flex-col rounded-t-xl h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
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
                    onClick={() => {
                      setNativeFilter('all');
                      setLayerFilter([]);
                      setFunctionFilter([]);
                    }}
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
                className="w-full"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {filteredSpecies.length} Results
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Species Detail Modal */}
      <SpeciesDetailModal
        speciesId={selectedSpeciesId}
        onClose={() => setSelectedSpeciesId(null)}
      />

      {/* Context-Aware FAB - Focus Search on Mobile */}
      <FAB
        icon={<Search className="h-6 w-6" />}
        onAction={() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        ariaLabel="Focus search"
      />
    </div>
  );
}
