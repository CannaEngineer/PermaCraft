import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { FarmReports } from '@/components/farm/farm-reports';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id: farmId } = await params;

  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) notFound();
  if (farm.user_id !== session.user.id) redirect(`/farm/${farmId}`);

  return (
    <FarmReports
      farmId={farmId}
      farmName={farm.name}
    />
  );
}
