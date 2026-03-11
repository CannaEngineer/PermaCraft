import { TourLandingClient } from '@/components/tour/tour-landing-client';

interface TourLandingPageProps {
  params: Promise<{ farmSlug: string }>;
}

export default async function TourLandingPage({ params }: TourLandingPageProps) {
  const { farmSlug } = await params;
  return <TourLandingClient farmSlug={farmSlug} />;
}
