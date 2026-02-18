import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    shop_headline: string | null;
    shop_banner_url: string | null;
    climate_zone: string | null;
    product_count: number;
  };
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shops/${shop.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="h-32 bg-gradient-to-br from-green-100 to-emerald-50 relative">
          {shop.shop_banner_url && (
            <img src={shop.shop_banner_url} alt={shop.name} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <h3 className="absolute bottom-2 left-3 font-bold text-white text-lg drop-shadow">{shop.name}</h3>
        </div>
        <CardContent className="p-3 space-y-2">
          {shop.shop_headline && (
            <p className="text-sm text-muted-foreground line-clamp-2">{shop.shop_headline}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />{shop.product_count} products
            </span>
            {shop.climate_zone && <Badge variant="secondary" className="text-xs">{shop.climate_zone}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
