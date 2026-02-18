'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShopCard } from '@/components/shop/shop-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';

const CATEGORY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'nursery_stock', label: 'Nursery Stock' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'vegetable_box', label: 'Veg Boxes' },
  { value: 'cut_flowers', label: 'Cut Flowers' },
  { value: 'teas_herbs', label: 'Teas & Herbs' },
  { value: 'tour', label: 'Tours' },
  { value: 'event', label: 'Events' },
  { value: 'digital', label: 'Digital' },
];

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchShops = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/shops?${params}`);
      setShops(await res.json());
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShops('', ''); }, [fetchShops]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchShops(search, cat);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Farm Shops</h1>
          <p className="text-muted-foreground">Buy directly from local permaculture farms</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchShops(search, category); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search farms..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {CATEGORY_FILTERS.map((f) => (
          <Button key={f.value} size="sm"
            variant={category === f.value ? 'default' : 'outline'}
            onClick={() => handleCategoryChange(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No shops found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      )}
    </div>
  );
}
