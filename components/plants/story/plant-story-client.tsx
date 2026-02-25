'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sprout, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FarmSelectorDialog } from '@/components/dashboard/farm-selector-dialog';
import { toast } from 'sonner';
import { StoryCardContainer } from './story-card-container';
import { MeetThePlantCard } from './meet-the-plant-card';
import { WhyItMattersCard } from './why-it-matters-card';
import { HowToGrowCard } from './how-to-grow-card';
import { CompanionPlantsCard } from './companion-plants-card';
import { WatchAndLearnCard } from './watch-and-learn-card';
import { GetThisPlantCard } from './get-this-plant-card';
import { InTheCommunityCard } from './in-the-community-card';
import { StoryProgressIndicator } from './story-progress-indicator';
import type { Species, SpeciesContent, ShopProduct, SpeciesVideo } from '@/lib/db/schema';

interface PlantStoryData {
  species: Species;
  companions: Species[];
  content: SpeciesContent | null;
  products: ShopProduct[];
}

interface PlantStoryClientProps {
  speciesId: string;
  isAuthenticated?: boolean;
}

export function PlantStoryClient({ speciesId, isAuthenticated }: PlantStoryClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PlantStoryData | null>(null);
  const [videos, setVideos] = useState<SpeciesVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const [farms, setFarms] = useState<Array<{ id: string; name: string; acres: number | null; center_lat?: number | null; center_lng?: number | null }>>([]);
  const [farmSelectorOpen, setFarmSelectorOpen] = useState(false);
  const [addingToFarm, setAddingToFarm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/species/${speciesId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load plant story:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [speciesId]);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch(`/api/species/${speciesId}/videos`);
        if (res.ok) {
          const json = await res.json();
          setVideos(json.videos || []);
        }
      } catch {
        // Videos are optional
      }
    }
    fetchVideos();
  }, [speciesId]);

  const addPlantToFarm = useCallback(async (farm: { id: string; name: string; center_lat?: number | null; center_lng?: number | null }) => {
    if (!farm.center_lat || !farm.center_lng) {
      toast.error('Farm has no location set');
      return;
    }
    setAddingToFarm(true);
    try {
      const res = await fetch(`/api/farms/${farm.id}/plantings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species_id: speciesId,
          lat: farm.center_lat,
          lng: farm.center_lng,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added to ${farm.name}!`, {
        description: 'You can reposition it on the map editor.',
        action: {
          label: 'View on Map',
          onClick: () => router.push(`/farm/${farm.id}`),
        },
      });
    } catch {
      toast.error('Failed to add plant to farm');
    } finally {
      setAddingToFarm(false);
    }
  }, [speciesId, router]);

  const handleAddToFarm = async () => {
    try {
      const res = await fetch('/api/farms');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const userFarms = data.farms || [];
      if (userFarms.length === 0) {
        toast.error('Create a farm first', {
          action: {
            label: 'Create Farm',
            onClick: () => router.push('/farm/new'),
          },
        });
        return;
      }
      setFarms(userFarms);
      if (userFarms.length === 1) {
        addPlantToFarm(userFarms[0]);
      } else {
        setFarmSelectorOpen(true);
      }
    } catch {
      toast.error('Failed to load farms');
    }
  };

  const handleFarmSelected = (farmId: string) => {
    setFarmSelectorOpen(false);
    const farm = farms.find(f => f.id === farmId);
    if (farm) addPlantToFarm(farm);
  };

  if (loading) {
    return <PlantStorySkeleton />;
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold mb-2">Plant not found</h2>
          <p className="text-muted-foreground mb-4">This species may have been removed.</p>
          <Button onClick={() => router.push('/plants')}>Back to Catalog</Button>
        </div>
      </div>
    );
  }

  const { species, companions, content, products } = data;

  // Build card list - always show hero + growing guide, others conditional
  const cardLabels: string[] = ['Meet'];
  const cards: React.ReactNode[] = [
    <MeetThePlantCard key="meet" species={species} />,
  ];

  if (content?.narrative_summary || content?.narrative_full) {
    cardLabels.push('Story');
    cards.push(<WhyItMattersCard key="why" content={content} species={species} />);
  }

  cardLabels.push('Grow');
  cards.push(<HowToGrowCard key="grow" species={species} content={content} />);

  if (companions.length > 0) {
    cardLabels.push('Friends');
    cards.push(<CompanionPlantsCard key="companions" companions={companions} species={species} />);
  }

  if (videos.length > 0) {
    cardLabels.push('Watch');
    cards.push(<WatchAndLearnCard key="watch" videos={videos} species={species} />);
  }

  if (products.length > 0 || species.sourcing_notes) {
    cardLabels.push('Get');
    cards.push(<GetThisPlantCard key="get" products={products} species={species} />);
  }

  cardLabels.push('Community');
  cards.push(<InTheCommunityCard key="community" species={species} />);

  return (
    <div className="relative">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-md rounded-full h-10 w-10"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Progress Indicator */}
      <StoryProgressIndicator
        totalCards={cards.length}
        activeCard={activeCard}
        labels={cardLabels}
      />

      {/* Story Cards */}
      <StoryCardContainer onActiveCardChange={setActiveCard}>
        {cards}
      </StoryCardContainer>

      {/* Sticky Add to Farm CTA */}
      {isAuthenticated && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button
            onClick={handleAddToFarm}
            disabled={addingToFarm}
            size="lg"
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-xl h-12 text-base font-semibold"
          >
            {addingToFarm ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sprout className="h-5 w-5" />
            )}
            {addingToFarm ? 'Adding...' : 'Add to My Farm'}
          </Button>
        </div>
      )}

      <FarmSelectorDialog
        open={farmSelectorOpen}
        onOpenChange={setFarmSelectorOpen}
        farms={farms}
        onSelect={handleFarmSelected}
        title="Add to which farm?"
      />
    </div>
  );
}

function PlantStorySkeleton() {
  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
