import { TourVisitorExperience } from '@/components/tours/tour-visitor-experience';
import type { Metadata } from 'next';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const result = await db.execute({
    sql: `SELECT t.title, t.description, t.tour_type, t.difficulty, t.estimated_duration_minutes,
          t.cover_image_url, t.og_image_url, t.tags,
          f.name as farm_name, f.description as farm_description,
          (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count
          FROM farm_tours t
          JOIN farms f ON t.farm_id = f.id
          WHERE t.share_slug = ? AND t.status = 'published'`,
    args: [slug],
  });

  const tour = result.rows[0] as any;
  if (!tour) {
    return { title: 'Tour Not Found' };
  }

  const isVirtual = tour.tour_type === 'virtual';
  const tourTypeLabel = isVirtual ? 'Virtual Tour' : 'Farm Tour';
  const title = `${tour.title} — ${tourTypeLabel} of ${tour.farm_name}`;
  const description = tour.description
    || `${isVirtual ? 'Explore' : 'Visit'} ${tour.farm_name} with this ${tour.difficulty} ${tourTypeLabel.toLowerCase()}. ${tour.stop_count} stops, ~${tour.estimated_duration_minutes || 30} minutes.`;

  const ogImage = tour.og_image_url || tour.cover_image_url || undefined;

  let keywords: string[] = ['permaculture', 'farm tour', tour.farm_name];
  if (tour.tags) {
    try {
      const tags = JSON.parse(tour.tags);
      if (Array.isArray(tags)) keywords = [...keywords, ...tags];
    } catch { /* ignore */ }
  }

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: tour.title }] }),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function TourPage({ params }: PageProps) {
  const { slug } = await params;

  return <TourVisitorExperience slug={slug} />;
}
