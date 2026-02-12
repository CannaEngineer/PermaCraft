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

  return (
    <DashboardClient>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
                <div className="flex-1">
                  <h1 className="text-4xl font-serif font-bold mb-2">
                    Welcome back, {session.user.name}! 👋
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Your permaculture dashboard and command center
                  </p>
                </div>

                {/* Quick Stats */}
                <DashboardStats
                  farmCount={farms.length}
                  plantingCount={totalPlantings}
                  postCount={totalPosts}
                  userId={session.user.id}
                />
              </div>

              {/* Search */}
              <div className="mb-6">
                <UniversalSearch
                  context="my-farms"
                  placeholder="Search your farms, zones, and conversations..."
                  className="max-w-2xl"
                />
              </div>

              {/* Quick Actions */}
              <QuickActions />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Farms & Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* My Farms Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <MapIcon className="w-6 h-6 text-primary" />
                        My Farms
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {farms.length} {farms.length === 1 ? 'farm' : 'farms'} in your portfolio
                      </p>
                    </div>
                    <Button asChild variant="default">
                      <Link href="/farm/new">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Farm
                      </Link>
                    </Button>
                  </div>

                  {farms.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <MapIcon className="h-8 w-8 text-primary" />
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {farms.map((farm) => (
                        <FarmCard key={farm.id} farm={farm} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Farm Activity Feed */}
                {farms.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-500" />
                        Recent Activity
                      </h2>
                    </div>
                    <FarmActivityFeed userId={session.user.id} />
                  </section>
                )}

                {/* Recent Community Posts */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-500" />
                        Community Highlights
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        See what others are sharing
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/gallery">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <RecentCommunityPosts currentUserId={session.user.id} />
                </section>
              </div>

              {/* Right Column - Learning & Blog */}
              <div className="space-y-6">
                {/* Learning Progress */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-green-500" />
                      Learning
                    </h2>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/learn">
                        Browse
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <LearningProgress userId={session.user.id} />
                </section>

                {/* Latest Blog Post */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      Latest Article
                    </h2>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/learn/blog">
                        All Posts
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                  <LatestBlogPost />
                </section>

                {/* Helpful Resources */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sprout className="w-4 h-4" />
                      Getting Started
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link
                      href="/learn"
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 transition-colors"
                    >
                      <span className="text-sm font-medium">Browse Lessons</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/plants"
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 transition-colors"
                    >
                      <span className="text-sm font-medium">Explore Plants</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/gallery"
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 transition-colors"
                    >
                      <span className="text-sm font-medium">Join Community</span>
                      <ArrowRight className="w-4 h-4" />
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
