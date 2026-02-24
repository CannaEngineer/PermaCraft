// app/(app)/shops/[farmId]/page.tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { ShopLandingPage } from '@/components/shop/storefront/shop-landing-page';
import type { ShopProduct } from '@/lib/db/schema';

async function getShop(farmId: string) {
  const farmResult = await db.execute({
    sql: `SELECT id, name, description, center_lat, center_lng, climate_zone,
                 is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery
          FROM farms WHERE id = ? AND is_shop_enabled = 1 AND is_public = 1`,
    args: [farmId],
  });
  if (!farmResult.rows[0]) return null;

  const productsResult = await db.execute({
    sql: `SELECT * FROM shop_products
          WHERE farm_id = ? AND is_published = 1
          ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
    args: [farmId],
  });

  return { shop: farmResult.rows[0], products: productsResult.rows };
}

export default async function ShopStorefrontPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const data = await getShop(farmId);
  if (!data) notFound();

  const session = await getSession();
  const {
    shop,
    products,
    storySections = [],
    plantingsSummary = [],
    farmOwner = { name: 'Farmer', image: null },
    latestScreenshot = null,
  } = data as {
    shop: any;
    products: ShopProduct[];
    storySections: any[];
    plantingsSummary: any[];
    farmOwner: { name: string; image: string | null };
    latestScreenshot: string | null;
  };

  return (
    <ShopLandingPage
      shop={shop}
      products={products}
      farmId={farmId}
      storySections={storySections}
      plantingsSummary={plantingsSummary}
      farmOwner={farmOwner}
      latestScreenshot={latestScreenshot}
      isAuthenticated={!!session}
    />
  );
}
