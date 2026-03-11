import { TourPoiClient } from '@/components/tour/tour-poi-client';

interface TourPoiPageProps {
  params: Promise<{ farmSlug: string; poiId: string }>;
}

export default async function TourPoiPage({ params }: TourPoiPageProps) {
  const { farmSlug, poiId } = await params;
  return <TourPoiClient farmSlug={farmSlug} poiId={poiId} />;
}
