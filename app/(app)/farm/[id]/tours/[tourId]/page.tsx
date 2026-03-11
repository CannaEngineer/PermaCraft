import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { TourEditorPage } from '@/components/tours/tour-editor-page';

interface PageProps {
  params: Promise<{ id: string; tourId: string }>;
}

export default async function FarmTourEditPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id, tourId } = await params;

  // Verify farm ownership
  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name FROM farms WHERE id = ? AND user_id = ?',
    args: [id, session.user.id],
  });

  const farm = farmResult.rows[0] as any;
  if (!farm) {
    notFound();
  }

  // Verify tour exists for this farm
  const tourResult = await db.execute({
    sql: 'SELECT id FROM farm_tours WHERE id = ? AND farm_id = ?',
    args: [tourId, id],
  });

  if (tourResult.rows.length === 0) {
    notFound();
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <TourEditorPage farmId={id} farmName={farm.name} tourId={tourId} />
    </div>
  );
}
