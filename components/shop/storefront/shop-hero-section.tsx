'use client';

import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface ShopHeroSectionProps {
  farmName: string;
  headline: string | null;
  bannerUrl: string | null;
  latestScreenshot: string | null;
}

export function ShopHeroSection({ farmName, headline, bannerUrl, latestScreenshot }: ShopHeroSectionProps) {
  const imageUrl = bannerUrl || latestScreenshot;

  const scrollToProducts = () => {
    document.getElementById('shop-products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-[50vh] min-h-[350px] overflow-hidden">
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-900" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-2 drop-shadow-lg">
            {farmName}
          </h1>
          {headline && (
            <p className="text-base sm:text-lg text-white/90 mb-6 drop-shadow max-w-lg">
              {headline}
            </p>
          )}
          <Button
            onClick={scrollToProducts}
            size="lg"
            className="rounded-xl bg-white text-primary font-semibold hover:bg-white/90 gap-2"
          >
            Shop Now
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
