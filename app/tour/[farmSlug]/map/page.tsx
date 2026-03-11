import { TourMapClient } from '@/components/tour/tour-map-client';

interface TourMapPageProps {
  params: Promise<{ farmSlug: string }>;
  searchParams: Promise<{ route?: string }>;
}

export default async function TourMapPage({ params, searchParams }: TourMapPageProps) {
  const { farmSlug } = await params;
  const { route } = await searchParams;
  return <TourMapClient farmSlug={farmSlug} routeId={route} />;
}
