// app/(app)/shops/[farmId]/page.tsx
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/shop/product-card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Cut Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tours', event: 'Events', digital: 'Digital', other: 'Other',
};

async function getShop(farmId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shops/${farmId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ShopStorefrontPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const data = await getShop(farmId);
  if (!data) notFound();

  const { shop, products } = data as { shop: any; products: ShopProduct[] };
  const categories = [...new Set(products.map((p) => p.category))];
  const fulfillmentMethods = [
    shop.accepts_shipping && 'Ships nationwide',
    shop.accepts_pickup && 'Local pickup',
    shop.accepts_delivery && 'Local delivery',
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-6xl mx-auto pb-20 md:pb-6">
      <div className="relative h-36 sm:h-48 bg-gradient-to-br from-green-200 to-emerald-100 overflow-hidden">
        {shop.shop_banner_url && (
          <img src={shop.shop_banner_url} alt={shop.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 right-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow truncate">{shop.name}</h1>
          {shop.shop_headline && <p className="text-sm sm:text-base text-white/90 mt-1 drop-shadow line-clamp-2">{shop.shop_headline}</p>}
        </div>
      </div>

      <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
        {fulfillmentMethods.length > 0 && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {fulfillmentMethods.map((m) => (
              <Badge key={m} variant="secondary" className="gap-1 text-xs sm:text-sm">
                <Truck className="w-3 h-3" />{m}
              </Badge>
            ))}
          </div>
        )}

        {categories.length > 1 && (
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {categories.map((cat) => (
              <Badge key={cat} variant="outline" className="text-xs sm:text-sm">{CATEGORY_LABELS[cat] || cat}</Badge>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} farmId={farmId} />
            ))}
          </div>
        )}

        {shop.shop_policy && (
          <div className="border rounded-lg p-3 sm:p-4 mt-4">
            <h3 className="font-semibold mb-2 text-sm sm:text-base">Shop Policy</h3>
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">{shop.shop_policy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
