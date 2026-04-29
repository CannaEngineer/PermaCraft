import { requireAuth } from "@/lib/auth/session";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardClientV2 } from "@/components/dashboard/dashboard-client-v2";
import { ProgressPanel } from "@/components/dashboard/progress-panel";
import {
  getDashboardFarms,
  getBatchEcoHealthScores,
  getFarmTasks,
  getRecentAiInsights,
  getBatchRecentActivity,
} from "@/lib/db/queries/dashboard";
import { getSeasonalContext } from "@/lib/dashboard/seasonal";
import { Task } from "@/lib/db/schema";
import { SeasonalContext } from "@/lib/dashboard/seasonal";
import { DashboardFarm } from "@/lib/db/queries/dashboard";

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
  if (!session) return null;

  const farms = await getDashboardFarms(session.user.id);
  const farmIds = farms.map((f) => f.id);

  const [ecoScores, activityByFarm, ...perFarmResults] = await Promise.all([
    getBatchEcoHealthScores(farmIds),
    getBatchRecentActivity(farmIds),
    ...farms.flatMap((farm) => [
      getFarmTasks(farm.id),
      getRecentAiInsights(farm.id),
    ]),
  ]);

  const farmData: Record<string, FarmData> = {};
  for (let i = 0; i < farms.length; i++) {
    const farm = farms[i];
    const tasks = perFarmResults[i * 2] as Task[];
    const insights = perFarmResults[i * 2 + 1] as any[];
    const ecoResult = ecoScores[farm.id] ?? { score: 0, functions: {} };
    const activity = activityByFarm[farm.id] ?? [];
    const seasonal = getSeasonalContext(farm.climate_zone, farm.center_lat);
    const urgentCount = tasks.filter(
      (t) => t.priority === 4 && t.status === "pending"
    ).length;

    farmData[farm.id] = {
      farm: { ...farm, eco_health_score: ecoResult.score },
      ecoScore: ecoResult.score,
      ecoFunctions: ecoResult.functions,
      tasks,
      insights,
      activity,
      seasonal,
      urgentCount,
    };
  }

  const firstName = session.user.name?.split(" ")[0] || session.user.name;
  const greeting = getGreeting();
  const now = new Date();
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const firstFarmData = farms.length > 0 ? farmData[farms[0].id] : null;
  const seasonLabel = firstFarmData?.seasonal.seasonLabel ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header — clean, warm, confident */}
      <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {dateString}
              {seasonLabel ? ` · ${seasonLabel}` : ""}
            </p>
          </div>
          <Link
            href="/farm/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Farm</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <DashboardClientV2
        farms={farms}
        farmData={farmData}
        userId={session.user.id}
        progressSlot={<ProgressPanel userId={session.user.id} />}
      />
    </div>
  );
}
