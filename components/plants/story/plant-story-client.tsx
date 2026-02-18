'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

export function PlantStoryClient({ speciesId }: { speciesId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlantStoryData | null>(null);
  const [videos, setVideos] = useState<SpeciesVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(0);

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
