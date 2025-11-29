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

  // Get farm
  const farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
    args: [id, session.user.id],
  });

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

  return <FarmEditorClient farm={farm} initialZones={zones} />;
}
