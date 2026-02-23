'use client';

import { useState, useEffect } from 'react';
import { PanelHeader } from './panel-header';
import { Store, MapPin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface ShopSummary {
  id: string;
  name: string;
  description: string | null;
  shop_headline: string | null;
  shop_banner_url: string | null;
  climate_zone: string | null;
  product_count: number;
}

export function ShopPanel() {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch('/api/shops')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => setShops(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Shop" subtitle="Browse farm shops" />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <AlertCircle className="h-10 w-10 text-destructive/40 mb-3" />
            <p className="text-sm font-medium mb-1">Failed to load shops</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(false);
                fetch('/api/shops')
                  .then(r => r.json())
                  .then(data => setShops(Array.isArray(data) ? data : []))
                  .catch(() => setError(true))
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium mb-1">No shops available yet</p>
            <p className="text-xs text-muted-foreground">
              Farm shops will appear here once farmers set up their stores.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {shops.map((shop) => (
              <a
                key={shop.id}
                href={`/shops/${shop.id}`}
                className="flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {shop.shop_banner_url ? (
                    <img src={shop.shop_banner_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{shop.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {shop.shop_headline || shop.description || 'Farm shop'}
                  </p>
                  {shop.climate_zone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Zone {shop.climate_zone}</span>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            ))}
          </div>
        )}

        {/* Browse all link */}
        <div className="p-4 border-t border-border/30">
          <a
            href="/shops"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors text-xs font-medium text-primary"
          >
            Browse All Shops
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
