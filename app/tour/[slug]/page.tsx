import { TourVisitorExperience } from '@/components/tours/tour-visitor-experience';
import type { Metadata } from 'next';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const result = await db.execute({
    sql: `SELECT t.title, t.description, f.name as farm_name
          FROM farm_tours t
          JOIN farms f ON t.farm_id = f.id
          WHERE t.share_slug = ? AND t.status = 'published'`,
    args: [slug],
  });

  const tour = result.rows[0] as any;
  if (!tour) {
    return { title: 'Tour Not Found' };
  }

  return {
    title: `${tour.title} — ${tour.farm_name} | Permaculture.Studio`,
    description: tour.description || `Take a self-guided tour of ${tour.farm_name}`,
  };
}

export default async function TourPage({ params }: PageProps) {
  const { slug } = await params;

  return <TourVisitorExperience slug={slug} />;
}
