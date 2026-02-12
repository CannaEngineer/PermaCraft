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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-background flex items-center justify-center border-2 border-amber-500/20">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage content, users, and monitor platform performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 hover:border-green-500/30 transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.lessons}</div>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-500/30 transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Newspaper className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.blogPosts}</div>
                  <p className="text-xs text-muted-foreground">Blog Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-500/30 transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.users}</div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-amber-500/30 transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Active (7d)</p>
                </div>
              </div>
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
    </div>
  );
}
