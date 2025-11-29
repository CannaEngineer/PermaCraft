import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Farm, Zone } from "@/lib/db/schema";
import { FarmEditorClient } from "./farm-editor-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // First try to fetch farm as owner
  let farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
    args: [id, session.user.id],
  });

  let isOwner = farmResult.rows.length > 0;

  // If not found as owner, try fetching as public farm
  if (!isOwner) {
    farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND is_public = 1",
      args: [id],
    });
  }

  const farm = farmResult.rows[0] as unknown as Farm;
  if (!farm) {
    notFound();
  }

  // Get zones
  const zonesResult = await db.execute({
    sql: "SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  const zones = zonesResult.rows as unknown as Zone[];

  return <FarmEditorClient farm={farm} initialZones={zones} isOwner={isOwner} />;
}
