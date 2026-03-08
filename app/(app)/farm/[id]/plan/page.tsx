import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { CropPlanner } from '@/components/farm/crop-planner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CropPlanPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id: farmId } = await params;

  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name, climate_zone FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) notFound();
  if (farm.user_id !== session.user.id) redirect(`/farm/${farmId}`);

  const zonesResult = await db.execute({
    sql: 'SELECT id, name, zone_type FROM zones WHERE farm_id = ?',
    args: [farmId],
  });

  const speciesResult = await db.execute({
    sql: 'SELECT id, common_name, scientific_name, layer FROM species ORDER BY common_name LIMIT 500',
    args: [],
  });

  return (
    <CropPlanner
      farmId={farmId}
      farmName={farm.name}
      climateZone={farm.climate_zone}
      zones={zonesResult.rows as any[]}
      species={speciesResult.rows as any[]}
    />
  );
}
