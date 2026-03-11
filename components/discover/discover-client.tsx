'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmTourCard } from './farm-tour-card';
import { FarmStoryCard } from './farm-story-card';
import { FarmUpdateCard } from './farm-update-card';
import { FeaturedFarmCard } from './featured-farm-card';
import { ShopCard } from '@/components/shop/shop-card';
import { RegisterCTA } from '@/components/shared/register-cta';
import {
  Search,
  Compass,
  Footprints,
  BookOpen,
  ShoppingBag,
  MessageSquare,
  TrendingUp,
  MapPin,
  Sprout,
  Store,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface DiscoverClientProps {
  isAuthenticated: boolean;
  initialData: any;
}

const TOUR_DIFFICULTY_FILTERS = [
  { value: '', label: 'All Tours' },
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'challenging', label: 'Challenging' },
];

const SHOP_CATEGORY_FILTERS = [
  { value: '', label: 'All Shops' },
  { value: 'nursery_stock', label: 'Nursery' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'vegetable_box', label: 'Produce' },
  { value: 'cut_flowers', label: 'Flowers' },
  { value: 'teas_herbs', label: 'Teas & Herbs' },
];

export function DiscoverClient({ isAuthenticated, initialData }: DiscoverClientProps) {
  const [activeTab, setActiveTab] = useState('tours');
  const [searchQuery, setSearchQuery] = useState('');
  const [tourFilter, setTourFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [tours, setTours] = useState<any[]>(initialData?.tours || []);
  const [stories, setStories] = useState<any[]>(initialData?.stories || []);
  const [updates, setUpdates] = useState<any[]>(initialData?.updates || []);
  const [shops, setShops] = useState<any[]>(initialData?.shops || []);
  const [loading, setLoading] = useState(false);

  const stats = initialData?.stats || {};
  const featuredFarms = initialData?.featured_farms || [];

  const fetchSection = useCallback(async (section: string, q: string, category: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ section, limit: '20' });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      const res = await fetch(`/api/discover?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    const data = await fetchSection(activeTab, searchQuery, activeTab === 'tours' ? tourFilter : shopFilter);
    switch (activeTab) {
      case 'tours': setTours(data); break;
      case 'stories': setStories(data); break;
      case 'updates': setUpdates(data); break;
      case 'shops': setShops(data); break;
    }
  }, [activeTab, searchQuery, tourFilter, shopFilter, fetchSection]);

  // Refetch on filter change
  useEffect(() => {
    if (tourFilter || shopFilter) {
      handleSearch();
    }
  }, [tourFilter, shopFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 via-emerald-50/40 to-amber-50/60 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-amber-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Compass className="w-4 h-4" />
              Discover Local Farms
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight mb-3">
              Explore. Tour. Support Local.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Take virtual farm tours, read farm stories, browse local products, and connect directly with permaculture farmers in your area.
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8 flex-wrap">
            {[
              { icon: MapPin, label: 'Farms', value: stats.total_farms || 0, color: 'text-green-600' },
              { icon: Footprints, label: 'Tours', value: stats.total_tours || 0, color: 'text-blue-600' },
              { icon: Store, label: 'Shops', value: stats.total_shops || 0, color: 'text-amber-600' },
              { icon: Sprout, label: 'Farmers', value: stats.total_farmers || 0, color: 'text-emerald-600' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="font-bold text-lg">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Featured Farms Carousel */}
          {featuredFarms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Featured Farms
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {featuredFarms.slice(0, 4).map((farm: any) => (
                  <FeaturedFarmCard key={farm.id} farm={farm} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        {/* Search Bar */}
        <div className="mb-6">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex gap-2 max-w-2xl mx-auto"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search farms, tours, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-background"
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              Search
            </Button>
          </form>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-xl mx-auto grid grid-cols-4 mb-6">
            <TabsTrigger value="tours" className="gap-1.5 text-xs sm:text-sm">
              <Footprints className="w-4 h-4" />
              <span className="hidden sm:inline">Farm</span> Tours
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4" />
              Stories
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="shops" className="gap-1.5 text-xs sm:text-sm">
              <ShoppingBag className="w-4 h-4" />
              Shops
            </TabsTrigger>
          </TabsList>

          {/* Tours Tab */}
          <TabsContent value="tours">
            {/* Difficulty filter pills */}
            <div className="flex gap-1.5 flex-wrap mb-6">
              {TOUR_DIFFICULTY_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={tourFilter === f.value ? 'default' : 'outline'}
                  onClick={() => setTourFilter(f.value)}
                  className="text-xs h-8"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <LoadingGrid count={6} />
            ) : tours.length === 0 ? (
              <EmptyState
                icon={Footprints}
                title="No tours yet"
                description="Be the first to create a farm tour and share your permaculture journey with visitors."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {tours.map((tour: any) => (
                  <FarmTourCard key={tour.id} tour={tour} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Stories Tab */}
          <TabsContent value="stories">
            {loading ? (
              <LoadingGrid count={4} tall />
            ) : stories.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No farm stories yet"
                description="Farms will share their permaculture journeys, values, and the story behind their land here."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {stories.map((story: any) => (
                  <FarmStoryCard key={story.farm_id} story={story} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates">
            {loading ? (
              <LoadingGrid count={6} />
            ) : updates.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No updates yet"
                description="Farms will post updates about their harvests, events, and permaculture progress here."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {updates.map((update: any) => (
                  <FarmUpdateCard key={update.id} update={update} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shops Tab */}
          <TabsContent value="shops">
            {/* Category filter pills */}
            <div className="flex gap-1.5 flex-wrap mb-6">
              {SHOP_CATEGORY_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={shopFilter === f.value ? 'default' : 'outline'}
                  onClick={() => setShopFilter(f.value)}
                  className="text-xs h-8"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <LoadingGrid count={6} />
            ) : shops.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No farm shops yet"
                description="Local farms will list their products, seeds, and farm experiences here."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {shops.map((shop: any) => (
                    <ShopCard key={shop.id} shop={shop} />
                  ))}
                </div>
                <div className="text-center mt-6">
                  <Link href="/shops">
                    <Button variant="outline" className="gap-2">
                      View All Shops
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <RegisterCTA variant="shops" />
        </section>
      )}

      {/* Bottom CTA for farmers */}
      <section className="border-t bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">
            Share Your Farm with the World
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Create virtual tours, tell your story, list products, and connect with customers who care about sustainable, local food.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated ? (
              <Link href="/canvas">
                <Button size="lg" className="gap-2">
                  <Sprout className="w-5 h-5" />
                  Go to My Farms
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  <Sprout className="w-5 h-5" />
                  Start Your Farm Profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadingGrid({ count, tall }: { count: number; tall?: boolean }) {
  return (
    <div className={`grid grid-cols-1 ${tall ? 'lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-4 md:gap-6`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`${tall ? 'h-48' : 'h-64'} bg-muted animate-pulse rounded-xl`}
        />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Footprints;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}
