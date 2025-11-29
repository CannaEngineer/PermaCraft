import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, MapIcon } from "lucide-react";
import type { Farm } from "@/lib/db/schema";

export default async function DashboardPage() {
  const session = await requireAuth();

  const result = await db.execute({
    sql: "SELECT * FROM farms WHERE user_id = ? ORDER BY updated_at DESC",
    args: [session.user.id],
  });

  const farms = result.rows as unknown as Farm[];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Farms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your permaculture designs
          </p>
        </div>
        <Button asChild>
          <Link href="/farm/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Farm
          </Link>
        </Button>
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No farms yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first farm to start planning your permaculture design
            </p>
            <Button asChild>
              <Link href="/farm/new">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Farm
              </Link>
            </Button>
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
                    {farm.acres ? `${farm.acres} acres` : "Size not set"}
                    {farm.climate_zone && ` • Zone ${farm.climate_zone}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {farm.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
