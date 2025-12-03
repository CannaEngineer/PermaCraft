'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SpeciesCard } from '@/components/species/species-card';
import { SpeciesFilterSidebar } from '@/components/species/species-filter-sidebar';
import { SpeciesDetailModal } from '@/components/species/species-detail-modal';
import type { Species } from '@/lib/db/schema';
import { Search } from 'lucide-react';

export default function PlantsPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [nativeFilter, setNativeFilter] = useState<'all' | 'native' | 'naturalized'>('all');
  const [layerFilter, setLayerFilter] = useState<string[]>([]);
  const [functionFilter, setFunctionFilter] = useState<string[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 overflow-y-auto">
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
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Plant Catalog</h1>
            <p className="text-muted-foreground">
              Browse native and naturalized species for your permaculture design
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by common or scientific name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Species Detail Modal */}
      <SpeciesDetailModal
        speciesId={selectedSpeciesId}
        onClose={() => setSelectedSpeciesId(null)}
      />
    </div>
  );
}
