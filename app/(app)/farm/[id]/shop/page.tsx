// app/(app)/farm/[id]/shop/page.tsx
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShopSettingsForm } from '@/components/shop/seller/shop-settings-form';
import { ProductTable } from '@/components/shop/seller/product-table';
import { Plus, ExternalLink } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

export default async function ShopDashboardPage({ params }: { params: { id: string } }) {
  const session = await requireAuth();

  const farmResult = await db.execute({
    sql: `SELECT id, name, is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery, delivery_radius_miles
          FROM farms WHERE id = ? AND user_id = ?`,
    args: [params.id, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const farm = farmResult.rows[0] as any;

  const productsResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE farm_id = ? ORDER BY sort_order ASC, created_at DESC',
    args: [params.id],
  });
  const products = productsResult.rows as unknown as ShopProduct[];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{farm.name} — Shop</h1>
          <p className="text-muted-foreground">Manage your farm storefront</p>
        </div>
        <div className="flex items-center gap-3">
          {farm.is_shop_enabled === 1 && (
            <Link href={`/shops/${params.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />View Storefront
              </Button>
            </Link>
          )}
          <Link href={`/farm/${params.id}/shop/products/new`}>
            <Button><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
      </div>

      <ShopSettingsForm farmId={params.id} initial={farm} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Products ({products.length})</h2>
          <Link href={`/farm/${params.id}/shop/products/new`}>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
        <ProductTable farmId={params.id} initialProducts={products} />
      </div>
    </div>
  );
}
