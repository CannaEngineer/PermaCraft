import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  TrendingUp,
  Activity,
  FileText,
  Shield,
  BarChart3,
  Settings,
  Newspaper,
  Zap
} from 'lucide-react';

export default async function AdminDashboardPage() {
  await requireAdmin();

  // Get overall stats
  const [lessonsResult, usersResult, activeResult, blogResult] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM lessons'),
    db.execute('SELECT COUNT(*) as count FROM users'),
    db.execute(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM lesson_completions
      WHERE completed_at > datetime('now', '-7 days')
    `),
    db.execute('SELECT COUNT(*) as count FROM blog_posts WHERE is_published = 1'),
  ]);

  const stats = {
    lessons: (lessonsResult.rows[0] as any).count,
    users: (usersResult.rows[0] as any).count,
    activeUsers: (activeResult.rows[0] as any).count,
    blogPosts: (blogResult.rows[0] as any).count,
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage content, users, and monitor platform performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lessons}</div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blogPosts}</div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Admin Sections</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Content Management */}
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Content Management</CardTitle>
                  <CardDescription>
                    Manage lessons, topics, and educational content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Generate new lessons with AI<br />
                  • Edit existing lesson content<br />
                  • Manage topics and learning paths<br />
                  • View content library and stats
                </p>
              </div>
              <Link href="/admin/content">
                <Button className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Content
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Blog Management */}
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Newspaper className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Blog Management</CardTitle>
                  <CardDescription>
                    AI-powered blog system with automated content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Generate AI-powered blog posts<br />
                  • SEO optimization and auto-tagging<br />
                  • View analytics and engagement<br />
                  • Manage published content
                </p>
              </div>
              <Link href="/admin/blog">
                <Button className="w-full">
                  <Newspaper className="h-4 w-4 mr-2" />
                  Blog Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage users, permissions, and monitor activity
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • View all users and their progress<br />
                  • Manage admin roles and permissions<br />
                  • Monitor user engagement<br />
                  • Handle user support requests
                </p>
              </div>
              <Link href="/admin/users">
                <Button className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure AI models and platform settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Configure AI text generation models<br />
                  • Set image generation preferences<br />
                  • Optimize for cost vs quality<br />
                  • View model pricing information
                </p>
              </div>
              <Link href="/admin/settings">
                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  AI Model Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Link href="/admin/content/generate">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Generate Lesson</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/blog">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Newspaper className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Manage Blog</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/content/library">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Content Library</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">View Users</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">AI Settings</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
