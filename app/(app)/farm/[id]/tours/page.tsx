import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { TourManager } from '@/components/tours/tour-manager';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmToursPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Verify farm ownership
  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name FROM farms WHERE id = ? AND user_id = ?',
    args: [id, session.user.id],
  });

  const farm = farmResult.rows[0] as any;
  if (!farm) {
    notFound();
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Link
          href={`/canvas?farm=${id}&section=farm`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          &larr; Back to {farm.name}
        </Link>
      </div>
      <TourManager farmId={id} farmName={farm.name} />
    </div>
  );
}
