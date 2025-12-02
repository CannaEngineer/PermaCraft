import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusIcon, MapIcon } from "lucide-react";
import { FarmCard } from "@/components/dashboard/farm-card";
import { UniversalSearch } from "@/components/search/universal-search";

export default async function DashboardPage() {
  const session = await requireAuth();

  // Get farms with their most recent screenshot from AI analyses
  const result = await db.execute({
    sql: `SELECT
            f.*,
            (SELECT screenshot_data
             FROM ai_analyses
             WHERE farm_id = f.id AND screenshot_data IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 1) as latest_screenshot_json
          FROM farms f
          WHERE f.user_id = ?
          ORDER BY f.updated_at DESC`,
    args: [session.user.id],
  });

  // Parse screenshot JSON arrays and extract first URL
  const farms = result.rows.map((row: any) => {
    let latestScreenshot = null;
    if (row.latest_screenshot_json) {
      try {
        const urls = JSON.parse(row.latest_screenshot_json);
        latestScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        console.error('Failed to parse screenshot JSON:', e);
      }
    }
    return {
      ...row,
      latest_screenshot: latestScreenshot,
    };
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Farms</h1>
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

      {/* Search My Farms */}
      <div className="mb-6">
        <UniversalSearch
          context="my-farms"
          placeholder="Search your farms, zones, and conversations..."
          className="max-w-2xl"
        />
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-serif font-semibold mb-2">
              No farms yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first farm to start planning your permaculture design.
            </p>
            <Button asChild variant="default" size="lg">
              <Link href="/farm/new">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Farm
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </div>
  );
}
