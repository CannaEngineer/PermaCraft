'use client';

import { StoryHeroSection } from './story-hero-section';
import { StoryTextSection } from './story-text-section';
import { StoryWhatWeGrow } from './story-what-we-grow';
import { StorySeasonsSection } from './story-seasons-section';
import { StoryVisitSection } from './story-visit-section';
import { StoryCtaBanner } from './story-cta-banner';
import { FarmFeedClient } from '@/components/feed/farm-feed-client';
import { RegisterCTA } from '@/components/shared/register-cta';
import type { Farm, FarmStorySection, ShopProduct } from '@/lib/db/schema';

interface Post {
  id: string;
  farm_id: string;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  ai_response_excerpt: string | null;
  ai_screenshot: string | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
}

interface FarmStoryPageProps {
  farm: Farm;
  sections: FarmStorySection[];
  farmOwner: { name: string; image: string | null };
  latestScreenshot: string | null;
  featuredProducts?: ShopProduct[];
  isShopEnabled: boolean;
  initialFeedData?: {
    posts: Post[];
    next_cursor: string | null;
    has_more: boolean;
  };
  currentUserId?: string;
  storyTheme: string;
  species?: Array<{
    common_name: string;
    scientific_name: string;
    layer: string;
    is_native: number;
    count: number;
  }>;
  fulfillment?: {
    shipping?: boolean;
    pickup?: boolean;
    delivery?: boolean;
  };
  publishedTours?: { id: string; title: string; share_slug: string; estimated_duration_minutes: number | null; stop_count: number }[];
}

export function FarmStoryPage({
  farm,
  sections,
  farmOwner,
  latestScreenshot,
  featuredProducts,
  isShopEnabled,
  initialFeedData,
  currentUserId,
  storyTheme,
  species,
  fulfillment,
  publishedTours = [],
}: FarmStoryPageProps) {
  // Build a lookup by section_type for easy access
  const sectionMap = new Map<string, FarmStorySection>();
  sections.forEach(s => {
    if (s.is_visible) sectionMap.set(s.section_type, s);
  });

  const heroSection = sectionMap.get('hero');
  const originSection = sectionMap.get('origin');
  const valuesSection = sectionMap.get('values');
  const landSection = sectionMap.get('the_land');
  const growSection = sectionMap.get('what_we_grow');
  const seasonsSection = sectionMap.get('seasons');
  const visitSection = sectionMap.get('visit_us');

  // Custom sections in display_order
  const customSections = sections.filter(s => s.section_type === 'custom' && s.is_visible);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      {heroSection && (
        <StoryHeroSection
          farmName={heroSection.title || farm.name}
          tagline={heroSection.content || ''}
          imageUrl={heroSection.media_url || latestScreenshot}
          owner={farmOwner}
          theme={storyTheme}
        />
      )}

      {/* Origin */}
      {originSection && (
        <StoryTextSection
          title={originSection.title}
          content={originSection.content || ''}
          mediaUrl={originSection.media_url}
          theme={storyTheme}
        />
      )}

      {/* Values */}
      {valuesSection && (
        <StoryTextSection
          title={valuesSection.title}
          content={valuesSection.content || ''}
          accent
          theme={storyTheme}
        />
      )}

      {/* The Land */}
      {landSection && (
        <StoryTextSection
          title={landSection.title}
          content={landSection.content || ''}
          mediaUrl={landSection.media_url}
          theme={storyTheme}
          farmStats={{
            acres: farm.acres,
            climateZone: farm.climate_zone,
            soilType: farm.soil_type,
          }}
        />
      )}

      {/* What We Grow */}
      {growSection && (
        <StoryWhatWeGrow
          title={growSection.title}
          content={growSection.content || ''}
          species={species || []}
          theme={storyTheme}
        />
      )}

      {/* Featured Products CTA (if shop enabled) */}
      {isShopEnabled && (
        <StoryCtaBanner
          farmId={farm.id}
          featuredProducts={featuredProducts}
          theme={storyTheme}
        />
      )}

      {/* Seasons */}
      {seasonsSection && (
        <StorySeasonsSection
          title={seasonsSection.title}
          content={seasonsSection.content || ''}
          theme={storyTheme}
        />
      )}

      {/* Custom sections */}
      {customSections.map((section, i) => (
        <StoryTextSection
          key={section.id}
          title={section.title}
          content={section.content || ''}
          mediaUrl={section.media_url}
          accent={i % 2 === 0}
          theme={storyTheme}
        />
      ))}

      {/* Visit Us */}
      {visitSection && (
        <StoryVisitSection
          title={visitSection.title}
          content={visitSection.content || ''}
          centerLat={farm.center_lat}
          centerLng={farm.center_lng}
          farmName={farm.name}
          fulfillment={fulfillment}
          isShopEnabled={isShopEnabled}
          farmId={farm.id}
          theme={storyTheme}
          publishedTours={publishedTours}
        />
      )}

      {/* Feed */}
      {initialFeedData && initialFeedData.posts.length > 0 && (
        <section className="py-12">
          <div className="max-w-2xl mx-auto px-6 sm:px-8">
            <h2 className="text-2xl font-bold mb-6">Recent Updates</h2>
            <FarmFeedClient
              farmId={farm.id}
              initialData={initialFeedData}
              currentUserId={currentUserId}
            />
          </div>
        </section>
      )}

      {/* Register CTA for unauthenticated users */}
      {!currentUserId && (
        <div className="max-w-2xl mx-auto px-6 pb-12">
          <RegisterCTA variant="plants" />
        </div>
      )}
    </div>
  );
}
