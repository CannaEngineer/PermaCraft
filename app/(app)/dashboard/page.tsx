import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalSearch } from "@/components/search/universal-search";
import { DashboardClientV2 } from "@/components/dashboard/dashboard-client-v2";
import {
  getDashboardFarms,
  getEcoHealthScore,
  getFarmTasks,
  getRecentAiInsights,
  getRecentActivity,
} from "@/lib/db/queries/dashboard";
import { getSeasonalContext } from "@/lib/dashboard/seasonal";
import { Task } from "@/lib/db/schema";
import { SeasonalContext } from "@/lib/dashboard/seasonal";
import { DashboardFarm } from "@/lib/db/queries/dashboard";

// Get time-based greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface FarmData {
  farm: DashboardFarm;
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  tasks: Task[];
  insights: any[];
  activity: any[];
  seasonal: SeasonalContext;
  urgentCount: number;
}

export default async function DashboardPage() {
  const session = await requireAuth();
  if (!session) return null; // requireAuth redirects, but this satisfies TS

  // Fetch farms using new query layer
  const farms = await getDashboardFarms(session.user.id);

  // For each farm, fetch eco health, tasks, insights, activity, seasonal context
  const farmData: Record<string, FarmData> = {};
  await Promise.all(
    farms.map(async (farm) => {
      const [ecoResult, tasks, insights, activity] = await Promise.all([
        getEcoHealthScore(farm.id),
        getFarmTasks(farm.id),
        getRecentAiInsights(farm.id),
        getRecentActivity(farm.id),
      ]);
      const seasonal = getSeasonalContext(farm.climate_zone, farm.center_lat);
      const urgentCount = tasks.filter(
        (t) => t.priority === 4 && t.status === "pending"
      ).length;

      farmData[farm.id] = {
        farm: { ...farm, eco_health_score: ecoResult.score },
        ecoScore: ecoResult.score,
        ecoFunctions: ecoResult.functions,
        tasks,
        insights: insights as any[],
        activity: activity as any[],
        seasonal,
        urgentCount,
      };
    })
  );

  // Get first name for personalization
  const firstName = session.user.name?.split(" ")[0] || session.user.name;
  const greeting = getGreeting();
  const now = new Date();
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get season label from first farm or default
  const firstFarmData = farms.length > 0 ? farmData[farms[0].id] : null;
  const seasonLabel = firstFarmData?.seasonal.seasonLabel ?? "";

  return (
    <div className="min-h-screen">
      {/* Top greeting bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-bold">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {dateString}
            {seasonLabel ? ` \u00B7 ${seasonLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UniversalSearch
            context="my-farms"
            placeholder="Search..."
            className="w-48 hidden sm:block"
          />
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/farm/new">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Farm
            </Link>
          </Button>
        </div>
      </div>

      {/* Farm-first intelligence hub */}
      <DashboardClientV2
        farms={farms}
        farmData={farmData}
        userId={session.user.id}
      />
    </div>
  );
}
