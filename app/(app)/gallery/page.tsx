import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapIcon } from "lucide-react";
import type { Farm } from "@/lib/db/schema";

export default async function GalleryPage() {
  await requireAuth();

  const result = await db.execute({
    sql: `SELECT f.*, u.name as user_name
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE f.is_public = 1
          ORDER BY f.updated_at DESC
          LIMIT 50`,
    args: [],
  });

  const farms = result.rows as unknown as (Farm & { user_name: string })[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Community Gallery</h1>
        <p className="text-muted-foreground mt-1">
          Explore permaculture designs from the community
        </p>
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No public farms yet</h3>
            <p className="text-muted-foreground text-center">
              Be the first to share your design!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Link key={farm.id} href={`/farm/${farm.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{farm.name}</CardTitle>
                  <CardDescription>
                    by {farm.user_name || "Anonymous"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {farm.description || "No description"}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {farm.acres && <span>{farm.acres} acres</span>}
                    {farm.climate_zone && <span>Zone {farm.climate_zone}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
