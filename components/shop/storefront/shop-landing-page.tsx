'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Package, Car, MapPin, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { ShopHeroSection } from './shop-hero-section';
import { ShopFeaturedProducts } from './shop-featured-products';
import { ShopProductGrid } from './shop-product-grid';
import { StoryWhatWeGrow } from '@/components/story/story-what-we-grow';
import { RegisterCTA } from '@/components/shared/register-cta';
import type { ShopProduct, FarmStorySection } from '@/lib/db/schema';

interface ShopLandingPageProps {
  shop: any;
  products: ShopProduct[];
  farmId: string;
  storySections: FarmStorySection[];
  plantingsSummary: Array<{
    common_name: string;
    scientific_name: string;
    layer: string;
    is_native: number;
    count: number;
  }>;
  farmOwner: { name: string; image: string | null };
  latestScreenshot: string | null;
  isAuthenticated: boolean;
}

export function ShopLandingPage({
  shop,
  products,
  farmId,
  storySections,
  plantingsSummary,
  farmOwner,
  latestScreenshot,
  isAuthenticated,
}: ShopLandingPageProps) {
  const featuredProducts = products.filter(p => p.is_featured === 1);
  const fulfillmentMethods = [
    shop.accepts_shipping && { icon: Truck, label: 'Ships Nationwide' },
    shop.accepts_pickup && { icon: Package, label: 'Local Pickup' },
    shop.accepts_delivery && { icon: Car, label: 'Local Delivery' },
  ].filter(Boolean) as Array<{ icon: any; label: string }>;

  // Find story sections for interludes
  const originSection = storySections.find(s => s.section_type === 'origin' || s.section_type === 'values');
  const landSection = storySections.find(s => s.section_type === 'the_land');
  const storyTheme = shop.story_theme || 'earth';

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Hero */}
      <ShopHeroSection
        farmName={shop.name}
        headline={shop.shop_headline}
        bannerUrl={shop.shop_banner_url}
        latestScreenshot={latestScreenshot}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Fulfillment strip */}
        {fulfillmentMethods.length > 0 && (
          <div className="flex gap-2 flex-wrap py-4 border-b">
            {fulfillmentMethods.map(({ icon: Icon, label }) => (
              <Badge key={label} variant="secondary" className="gap-1.5 text-sm py-1.5">
                <Icon className="w-3.5 h-3.5" />{label}
              </Badge>
            ))}
          </div>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <ShopFeaturedProducts products={featuredProducts} farmId={farmId} />
        )}

        {/* Story Interlude: Origin/Values */}
        {originSection && (
          <section className="py-8 border-y my-4">
            <div className="max-w-2xl">
              <h3 className="text-lg font-serif font-semibold mb-2">{originSection.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4">
                {originSection.content}
              </p>
              <Link href={`/farm/${farmId}`} className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Read our full story
              </Link>
            </div>
          </section>
        )}

        {/* What We Grow */}
        {plantingsSummary.length > 0 && (
          <StoryWhatWeGrow
            title="What We Grow"
            content=""
            species={plantingsSummary}
            theme={storyTheme}
          />
        )}

        {/* All Products */}
        <ShopProductGrid products={products} farmId={farmId} />

        {/* Story Interlude: The Land */}
        {landSection && (
          <section className="py-8 border-t my-4">
            <div className="max-w-2xl">
              <h3 className="text-lg font-serif font-semibold mb-2">{landSection.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4">
                {landSection.content}
              </p>
            </div>
          </section>
        )}

        {/* Visit / Location */}
        {shop.center_lat && shop.center_lng && (
          <section className="py-8 border-t">
            <h3 className="text-lg font-semibold mb-4">Find Us</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden shadow border h-[250px]">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${shop.center_lng - 0.01},${shop.center_lat - 0.01},${shop.center_lng + 0.01},${shop.center_lat + 0.01}&layer=mapnik&marker=${shop.center_lat},${shop.center_lng}`}
                  className="w-full h-full"
                  style={{ border: 0 }}
                  title={`${shop.name} location`}
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col justify-center gap-3">
                {shop.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{shop.description}</p>
                )}
                <a
                  href={`https://www.openstreetmap.org/directions?to=${shop.center_lat},${shop.center_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <MapPin className="w-4 h-4" />
                    Get Directions
                  </Button>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Shop Policy */}
        {shop.shop_policy && (
          <details className="border rounded-lg p-4 mt-4">
            <summary className="font-semibold text-sm cursor-pointer">Shop Policy</summary>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">{shop.shop_policy}</p>
          </details>
        )}

        {/* Farm CTA */}
        {storySections.length > 0 && (
          <div className="text-center py-8 mt-4 border-t">
            <p className="text-muted-foreground text-sm mb-3">Want to learn more about our farm?</p>
            <Link href={`/farm/${farmId}`}>
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Read Our Full Story
              </Button>
            </Link>
          </div>
        )}

        {/* Register CTA */}
        {!isAuthenticated && (
          <div className="mt-10">
            <RegisterCTA variant="shops" />
          </div>
        )}
      </div>
    </div>
  );
}
