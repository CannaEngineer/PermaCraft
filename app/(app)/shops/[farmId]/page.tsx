// app/(app)/shops/[farmId]/page.tsx
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ShopLandingPage } from '@/components/shop/storefront/shop-landing-page';
import type { ShopProduct } from '@/lib/db/schema';

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
