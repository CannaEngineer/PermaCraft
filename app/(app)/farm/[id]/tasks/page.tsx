import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { TaskBoard } from '@/components/farm/task-board';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TasksPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id: farmId } = await params;

  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) notFound();
  if (farm.user_id !== session.user.id) redirect(`/farm/${farmId}`);

  const zonesResult = await db.execute({
    sql: 'SELECT id, name, zone_type FROM zones WHERE farm_id = ?',
    args: [farmId],
  });

  const plantingsResult = await db.execute({
    sql: `SELECT p.id, p.name, s.common_name
          FROM plantings p
          JOIN species s ON p.species_id = s.id
          WHERE p.farm_id = ?`,
    args: [farmId],
  });

  return (
    <TaskBoard
      farmId={farmId}
      farmName={farm.name}
      zones={zonesResult.rows as any[]}
      plantings={plantingsResult.rows as any[]}
    />
  );
}
