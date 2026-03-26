import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import { PlusIcon, Search } from "lucide-react";
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

  // Aggregate stats across all farms
  const totalPlantings = farms.reduce((sum, f) => sum + (f.planting_count || 0), 0);
  const totalFarms = farms.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                {dateString}
                {seasonLabel ? ` · ${seasonLabel}` : ""}
                {totalFarms > 0 && (
                  <span className="hidden sm:inline">
                    {" · "}{totalFarms} farm{totalFarms !== 1 ? "s" : ""} · {totalPlantings} planting{totalPlantings !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <UniversalSearch
                context="my-farms"
                placeholder="Search farms..."
                className="w-52 hidden sm:block"
              />
              <Link
                href="/farm/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all active:scale-[0.97]"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New Farm</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto">
        <DashboardClientV2
          farms={farms}
          farmData={farmData}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
