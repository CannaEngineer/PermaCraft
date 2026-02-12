import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, MapIcon, TrendingUp, BookOpen, Users, Sprout, ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import { FarmCard } from "@/components/dashboard/farm-card";
import { UniversalSearch } from "@/components/search/universal-search";
import { DashboardClient } from "./dashboard-client";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LearningProgress } from "@/components/dashboard/learning-progress";
import { RecentCommunityPosts } from "@/components/dashboard/recent-community-posts";
import { LatestBlogPost } from "@/components/dashboard/latest-blog-post";
import { FarmActivityFeed } from "@/components/dashboard/farm-activity-feed";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { Separator } from "@/components/ui/separator";

// Get time-based greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireAuth();

  // Get farms with their most recent screenshot and planting counts from AI analyses
  const result = await db.execute({
    sql: `SELECT
            f.*,
            (SELECT screenshot_data
             FROM ai_analyses
             WHERE farm_id = f.id AND screenshot_data IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 1) as latest_screenshot_json,
            (SELECT COUNT(*)
             FROM plantings
             WHERE farm_id = f.id) as planting_count,
            (SELECT COUNT(*)
             FROM farm_posts
             WHERE farm_id = f.id AND is_published = 1) as post_count
          FROM farms f
          WHERE f.user_id = ?
          ORDER BY f.updated_at DESC`,
    args: [session.user.id],
  });

  // Parse screenshot JSON arrays and extract first URL
  const farms = await Promise.all(result.rows.map(async (row: any) => {
    let latestScreenshot = null;
    if (row.latest_screenshot_json) {
      try {
        const urls = JSON.parse(row.latest_screenshot_json);
        latestScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        console.error('Failed to parse screenshot JSON:', e);
      }
    }

    // Fetch plantings with species data for vitals
    const plantingsResult = await db.execute({
      sql: `SELECT
              p.id,
              p.species_id,
              s.common_name,
              s.permaculture_functions
            FROM plantings p
            JOIN species s ON p.species_id = s.id
            WHERE p.farm_id = ?`,
      args: [row.id],
    });

    return {
      ...row,
      latest_screenshot: latestScreenshot,
      plantings: plantingsResult.rows,
    };
  }));

  // Get user stats
  const totalPlantings = farms.reduce((sum, farm) => sum + (farm.planting_count || 0), 0);
  const totalPosts = farms.reduce((sum, farm) => sum + (farm.post_count || 0), 0);

  // Get first name for personalization
  const firstName = session.user.name?.split(' ')[0] || session.user.name;

  return (
    <DashboardClient>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section - Clean & Minimal */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Greeting */}
              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {getGreeting()}
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-bold">
                  {firstName}
                </h1>
              </div>

              {/* Stats - Prominent Cards */}
              <div className="mb-6">
                <DashboardStats
                  farmCount={farms.length}
                  plantingCount={totalPlantings}
                  postCount={totalPosts}
                  userId={session.user.id}
                />
              </div>

              {/* Quick Actions - iOS/Material Style */}
              <div className="mb-6">
                <QuickActions />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Search - Prominent Position */}
            <div className="mb-8">
              <UniversalSearch
                context="my-farms"
                placeholder="Search your farms, zones, and conversations..."
                className="max-w-2xl"
              />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column - Primary Content (2/3 width) */}
              <div className="lg:col-span-2 space-y-8">
                {/* My Farms Section */}
                <section className="animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
                        <MapIcon className="w-5 h-5 text-primary" />
                        My Farms
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {farms.length} {farms.length === 1 ? 'farm' : 'farms'} in your portfolio
                      </p>
                    </div>
                    <Button asChild size="default" className="rounded-xl">
                      <Link href="/farm/new">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Farm
                      </Link>
                    </Button>
                  </div>

                  {farms.length === 0 ? (
                    <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300">
                      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                          <MapIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          No farms yet
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                          Create your first farm to start planning your permaculture design.
                        </p>
                        <Button asChild size="lg" className="rounded-xl h-12">
                          <Link href="/farm/new">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Your First Farm
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {farms.map((farm, index) => (
                        <div
                          key={farm.id}
                          className="animate-in fade-in slide-in-from-bottom duration-500"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <FarmCard farm={farm} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator className="my-8" />

                {/* Farm Activity Feed */}
                {farms.length > 0 && (
                  <section className="animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Recent Activity
                      </h2>
                    </div>
                    <FarmActivityFeed userId={session.user.id} />
                  </section>
                )}

                {farms.length > 0 && <Separator className="my-8" />}

                {/* Recent Community Posts */}
                <section className="animate-in fade-in duration-500" style={{ animationDelay: '300ms' }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
                        <Users className="w-5 h-5 text-blue-500" />
                        Community Highlights
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        See what others are sharing
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="rounded-lg">
                      <Link href="/gallery">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <RecentCommunityPosts currentUserId={session.user.id} />
                </section>
              </div>

              {/* Right Column - Secondary Content (1/3 width) */}
              <div className="space-y-6">
                {/* Learning Progress */}
                <section className="animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-green-500" />
                      Learning
                    </h3>
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
                      <Link href="/learn">
                        Browse
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <LearningProgress userId={session.user.id} />
                </section>

                {/* Latest Blog Post */}
                <section className="animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      Latest Article
                    </h3>
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
                      <Link href="/learn/blog">
                        All Posts
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <LatestBlogPost />
                </section>

                {/* Getting Started Card */}
                <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in duration-500" style={{ animationDelay: '300ms' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-primary" />
                      Getting Started
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <Link
                      href="/learn"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background/60 transition-all duration-200 active:scale-[0.98] group"
                    >
                      <span className="text-sm font-medium">Browse Lessons</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </Link>
                    <Link
                      href="/plants"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background/60 transition-all duration-200 active:scale-[0.98] group"
                    >
                      <span className="text-sm font-medium">Explore Plants</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </Link>
                    <Link
                      href="/gallery"
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background/60 transition-all duration-200 active:scale-[0.98] group"
                    >
                      <span className="text-sm font-medium">Join Community</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardClient>
  );
}
