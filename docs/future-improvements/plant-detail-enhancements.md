# Plant Detail Section Enhancements
**Status:** Deferred
**Priority:** Medium
**Complexity:** Medium
**Estimated Effort:** 4-6 days

## Overview
Transform species detail pages from simple fact sheets into comprehensive plant knowledge hubs with related content, community examples, cultivation guides, and user-contributed tips.

## Business Value
- **User Engagement**: Deeper content keeps users exploring longer
- **Community Building**: User contributions create network effects
- **SEO**: Rich plant pages rank well for plant name searches
- **Educational Value**: Becomes go-to resource for plant information
- **Decision Support**: Helps users choose right plants for their designs

## Current State

Existing species detail page shows:
- ✅ Basic botanical information (scientific/common names)
- ✅ Layer, zones, sun/water requirements
- ✅ Native regions
- ✅ Permaculture functions
- ❌ **Missing**: Related species, cultivation guides, community examples, videos, seasonal care

## Enhanced Architecture

### Database Extensions

```sql
-- Migration: migrations/034_plant_detail_enhancements.sql

-- Companion planting relationships
CREATE TABLE IF NOT EXISTS species_companions (
  species_a_id TEXT NOT NULL,
  species_b_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('companion', 'antagonist', 'neutral', 'guild')),
  relationship_strength REAL DEFAULT 1.0,  -- 0.0 to 1.0
  notes TEXT,
  source TEXT,                             -- Citation or reference
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (species_a_id, species_b_id),
  FOREIGN KEY (species_a_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (species_b_id) REFERENCES species(id) ON DELETE CASCADE
);

-- Cultivation guides
CREATE TABLE IF NOT EXISTS cultivation_guides (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  guide_type TEXT NOT NULL CHECK(guide_type IN ('general', 'propagation', 'pruning', 'harvest', 'pest_management', 'seasonal_care')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,                   -- Markdown
  author_id TEXT,
  is_community_contributed INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Seasonal care calendar
CREATE TABLE IF NOT EXISTS species_seasonal_tasks (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  season TEXT NOT NULL CHECK(season IN ('spring', 'summer', 'fall', 'winter')),
  month INTEGER CHECK(month BETWEEN 1 AND 12),  -- Optional: specific month
  climate_zones TEXT,                      -- JSON: Which zones this applies to
  task_type TEXT NOT NULL CHECK(task_type IN ('plant', 'prune', 'fertilize', 'harvest', 'protect', 'divide', 'observe')),
  description TEXT NOT NULL,
  is_critical INTEGER DEFAULT 0,           -- Must-do vs. optional
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

-- Pest and disease info
CREATE TABLE IF NOT EXISTS species_pests_diseases (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK(issue_type IN ('pest', 'disease', 'deficiency')),
  name TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  prevention TEXT,
  organic_treatment TEXT,
  conventional_treatment TEXT,
  severity TEXT CHECK(severity IN ('minor', 'moderate', 'severe')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

-- Varieties and cultivars
CREATE TABLE IF NOT EXISTS species_varieties (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  variety_name TEXT NOT NULL,
  description TEXT,
  distinguishing_features TEXT,          -- What makes it different
  zones TEXT,                            -- JSON: Hardiness zones
  image_url TEXT,
  source TEXT,                           -- Where to buy
  is_heirloom INTEGER DEFAULT 0,
  is_hybrid INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

-- User tips and observations
CREATE TABLE IF NOT EXISTS species_user_tips (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  farm_id TEXT,                          -- Optional: related to specific farm
  tip_type TEXT CHECK(tip_type IN ('success_story', 'warning', 'technique', 'observation', 'question')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location TEXT,                         -- "Pacific Northwest", "Zone 7b"
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,         -- Moderator verification
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL
);

-- Media gallery (photos, videos)
CREATE TABLE IF NOT EXISTS species_media (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  user_id TEXT,
  media_type TEXT NOT NULL CHECK(media_type IN ('photo', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  growth_stage TEXT,                     -- 'seedling', 'flowering', 'fruiting', 'dormant'
  season TEXT,
  location TEXT,
  upvotes INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Community farm examples
CREATE TABLE IF NOT EXISTS species_farm_examples (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  planting_id TEXT,                      -- Specific planting instance
  title TEXT NOT NULL,
  description TEXT,
  success_rating INTEGER CHECK(success_rating BETWEEN 1 AND 5),
  years_growing INTEGER,
  primary_photo_url TEXT,
  is_public INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL
);

-- Related research articles
CREATE TABLE IF NOT EXISTS species_research (
  species_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  relevance REAL DEFAULT 1.0,            -- How relevant (0.0-1.0)
  PRIMARY KEY (species_id, article_id),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES research_articles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_companions_species ON species_companions(species_a_id);
CREATE INDEX idx_guides_species ON cultivation_guides(species_id, guide_type);
CREATE INDEX idx_seasonal_species ON species_seasonal_tasks(species_id, season);
CREATE INDEX idx_pests_species ON species_pests_diseases(species_id);
CREATE INDEX idx_varieties_species ON species_varieties(species_id);
CREATE INDEX idx_tips_species ON species_user_tips(species_id, upvotes DESC);
CREATE INDEX idx_media_species ON species_media(species_id, is_featured DESC);
CREATE INDEX idx_examples_species ON species_farm_examples(species_id, is_public);
```

### TypeScript Types

```typescript
// lib/db/schema.ts

export interface SpeciesCompanion {
  species_a_id: string;
  species_b_id: string;
  relationship_type: 'companion' | 'antagonist' | 'neutral' | 'guild';
  relationship_strength: number;
  notes?: string;
  source?: string;
  created_at: number;
}

export interface CultivationGuide {
  id: string;
  species_id: string;
  guide_type: 'general' | 'propagation' | 'pruning' | 'harvest' | 'pest_management' | 'seasonal_care';
  title: string;
  content: string; // Markdown
  author_id?: string;
  is_community_contributed: 0 | 1;
  upvotes: number;
  created_at: number;
  updated_at: number;
}

export interface SpeciesSeasonalTask {
  id: string;
  species_id: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  month?: number;
  climate_zones?: string; // JSON
  task_type: 'plant' | 'prune' | 'fertilize' | 'harvest' | 'protect' | 'divide' | 'observe';
  description: string;
  is_critical: 0 | 1;
  created_at: number;
}

export interface SpeciesUserTip {
  id: string;
  species_id: string;
  user_id: string;
  farm_id?: string;
  tip_type: 'success_story' | 'warning' | 'technique' | 'observation' | 'question';
  title: string;
  content: string;
  location?: string;
  upvotes: number;
  downvotes: number;
  is_verified: 0 | 1;
  created_at: number;
}

export interface SpeciesFarmExample {
  id: string;
  species_id: string;
  farm_id: string;
  planting_id?: string;
  title: string;
  description?: string;
  success_rating?: number; // 1-5
  years_growing?: number;
  primary_photo_url?: string;
  is_public: 0 | 1;
  created_at: number;
}
```

### Enhanced UI Components

```typescript
// app/(app)/plants/[id]/page.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfo } from '@/components/species/basic-info';
import { CultivationGuidePanel } from '@/components/species/cultivation-guide-panel';
import { SeasonalCalendar } from '@/components/species/seasonal-calendar';
import { RelatedSpecies } from '@/components/species/related-species';
import { CommunityExamples } from '@/components/species/community-examples';
import { MediaGallery } from '@/components/species/media-gallery';
import { UserTips } from '@/components/species/user-tips';
import { ResearchArticles } from '@/components/species/research-articles';
import { db } from '@/lib/db';

export default async function PlantDetailPage({ params }: { params: { id: string } }) {
  const species = await getSpecies(params.id);
  const companions = await getCompanions(params.id);
  const guides = await getCultivationGuides(params.id);
  const seasonalTasks = await getSeasonalTasks(params.id);
  const examples = await getCommunityExamples(params.id);
  const media = await getSpeciesMedia(params.id);
  const tips = await getUserTips(params.id);
  const research = await getRelatedResearch(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with hero image and basic info */}
      <header className="mb-8">
        <BasicInfo species={species} />
      </header>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cultivation">Cultivation</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Care</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="media">Photos/Videos</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RelatedSpecies companions={companions} />
          <UserTips tips={tips} speciesId={params.id} />
        </TabsContent>

        <TabsContent value="cultivation">
          <CultivationGuidePanel guides={guides} speciesId={params.id} />
        </TabsContent>

        <TabsContent value="seasonal">
          <SeasonalCalendar tasks={seasonalTasks} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityExamples examples={examples} speciesId={params.id} />
        </TabsContent>

        <TabsContent value="media">
          <MediaGallery media={media} speciesId={params.id} />
        </TabsContent>

        <TabsContent value="research">
          <ResearchArticles articles={research} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

```typescript
// components/species/seasonal-calendar.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Scissors, Droplets, Sun, Shield, Eye } from 'lucide-react';
import type { SpeciesSeasonalTask } from '@/lib/db/schema';

const seasonColors = {
  spring: 'bg-green-100 text-green-800 border-green-300',
  summer: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  fall: 'bg-orange-100 text-orange-800 border-orange-300',
  winter: 'bg-blue-100 text-blue-800 border-blue-300'
};

const taskIcons = {
  plant: Leaf,
  prune: Scissors,
  fertilize: Droplets,
  harvest: Sun,
  protect: Shield,
  observe: Eye
};

export function SeasonalCalendar({ tasks }: { tasks: SpeciesSeasonalTask[] }) {
  const seasons = ['spring', 'summer', 'fall', 'winter'] as const;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {seasons.map(season => {
        const seasonTasks = tasks.filter(t => t.season === season);

        return (
          <Card key={season} className={seasonColors[season]}>
            <CardHeader>
              <CardTitle className="capitalize">{season}</CardTitle>
            </CardHeader>
            <CardContent>
              {seasonTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific tasks</p>
              ) : (
                <div className="space-y-3">
                  {seasonTasks.map(task => {
                    const Icon = taskIcons[task.task_type];
                    return (
                      <div key={task.id} className="flex gap-3">
                        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize text-xs">
                              {task.task_type.replace('_', ' ')}
                            </Badge>
                            {task.is_critical === 1 && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{task.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

```typescript
// components/species/community-examples.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Calendar } from 'lucide-react';
import type { SpeciesFarmExample } from '@/lib/db/schema';
import Image from 'next/image';

export function CommunityExamples({
  examples,
  speciesId
}: {
  examples: SpeciesFarmExample[];
  speciesId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Community Growing This Plant</h2>
        <Button variant="outline">Share Your Experience</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examples.map(example => (
          <Card key={example.id} className="hover:shadow-lg transition-shadow">
            {example.primary_photo_url && (
              <div className="relative h-48 w-full">
                <Image
                  src={example.primary_photo_url}
                  alt={example.title}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-lg">{example.title}</CardTitle>
              {example.success_rating && (
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < example.success_rating!
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {example.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {example.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {example.years_growing && (
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {example.years_growing} {example.years_growing === 1 ? 'year' : 'years'}
                  </Badge>
                )}
              </div>

              <Button variant="link" className="mt-3 p-0 h-auto" asChild>
                <a href={`/farm/${example.farm_id}`}>
                  View Farm <MapPin className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {examples.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No community examples yet. Be the first to share your experience!
            </p>
            <Button>Share Your Success Story</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

```typescript
// components/species/user-tips.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, MessageSquare, AlertTriangle, Lightbulb } from 'lucide-react';
import type { SpeciesUserTip } from '@/lib/db/schema';

const tipIcons = {
  success_story: Lightbulb,
  warning: AlertTriangle,
  technique: MessageSquare,
  observation: Eye,
  question: MessageSquare
};

const tipColors = {
  success_story: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-red-100 text-red-800 border-red-300',
  technique: 'bg-blue-100 text-blue-800 border-blue-300',
  observation: 'bg-purple-100 text-purple-800 border-purple-300',
  question: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

export function UserTips({
  tips,
  speciesId
}: {
  tips: SpeciesUserTip[];
  speciesId: string;
}) {
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');

  const sortedTips = [...tips].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.upvotes - a.upvotes;
    }
    return b.created_at - a.created_at;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Community Tips & Observations</h2>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            Most Helpful
          </Button>
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            Recent
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedTips.map(tip => {
          const Icon = tipIcons[tip.tip_type];
          return (
            <Card key={tip.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-semibold">{tip.upvotes}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold">{tip.title}</h3>
                      <Badge variant="outline" className={tipColors[tip.tip_type]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {tip.tip_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {tip.content}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {tip.location && (
                        <span>📍 {tip.location}</span>
                      )}
                      {tip.is_verified === 1 && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" className="w-full">
        Share Your Tip
      </Button>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Related Content (2 days)
- Companion species relationships
- Related research articles
- "Users also grew..." recommendations

### Phase 2: Cultivation Guides (1-2 days)
- Cultivation guide system
- Seasonal calendar
- Pest/disease database
- Varieties comparison

### Phase 3: Community Features (2 days)
- User tips and observations
- Farm examples showcase
- Media gallery
- Upvoting system

### Phase 4: Polish (1 day)
- Responsive design
- Performance optimization
- SEO enhancements
- Admin moderation tools

## Content Strategy

### Seed Data Sources
- **Companion Planting**: Parse existing databases (plants.usda.gov)
- **Seasonal Tasks**: Extract from gardening calendars
- **Pests/Diseases**: University extension publications
- **Varieties**: Seed company catalogs (Baker Creek, Johnny's, etc.)

### Community Contributions
- Encourage users to share success stories
- Moderate and verify tips
- Feature high-quality contributions
- Reward contributors with badges/karma

## Future Enhancements

- **AI-Generated Guides**: Use AI to create missing cultivation guides
- **Regional Customization**: Show content relevant to user's climate zone
- **Integration with Farms**: "See this plant in action on nearby farms"
- **Video Tutorials**: Embed YouTube/Vimeo cultivation videos
- **Quiz/Assessment**: "Is this plant right for your farm?"
- **Print-Friendly**: Export plant profiles to PDF
