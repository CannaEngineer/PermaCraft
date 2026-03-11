import { TourCompleteClient } from '@/components/tour/tour-complete-client';

interface TourCompletePageProps {
  params: Promise<{ farmSlug: string }>;
}

export default async function TourCompletePage({ params }: TourCompletePageProps) {
  const { farmSlug } = await params;
  return <TourCompleteClient farmSlug={farmSlug} />;
}
