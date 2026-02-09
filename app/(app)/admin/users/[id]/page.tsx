import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Map,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { UserActionButtons } from '@/components/admin/user-action-buttons';

interface PageProps {
  params: { id: string };
}

export default async function UserDetailPage({ params }: PageProps) {
  await requireAdmin();

  // Get user details with calculated stats
  const userResult = await db.execute({
    sql: `
      SELECT
        u.*,
        COUNT(DISTINCT lc.id) as lessons_completed,
        SUM(l.xp_reward) as total_xp,
        COUNT(DISTINCT ub.id) as badges_earned
      FROM users u
      LEFT JOIN lesson_completions lc ON u.id = lc.user_id
      LEFT JOIN lessons l ON lc.lesson_id = l.id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `,
    args: [params.id],
  });

  if (userResult.rows.length === 0) {
    notFound();
  }

  const user = userResult.rows[0] as any;

  // Get user's farms
  const farmsResult = await db.execute({
    sql: `SELECT * FROM farms WHERE user_id = ? ORDER BY created_at DESC`,
    args: [params.id],
  });
  const farms = farmsResult.rows;

  // Get recent lesson completions
  const lessonsResult = await db.execute({
    sql: `
      SELECT
        lc.*,
        l.title,
        l.xp_reward,
        t.name as topic_name
      FROM lesson_completions lc
      LEFT JOIN lessons l ON lc.lesson_id = l.id
      LEFT JOIN topics t ON l.topic_id = t.id
      WHERE lc.user_id = ?
      ORDER BY lc.completed_at DESC
      LIMIT 10
    `,
    args: [params.id],
  });
  const recentLessons = lessonsResult.rows;

  // Get earned badges
  const badgesResult = await db.execute({
    sql: `
      SELECT
        ub.*,
        b.name,
        b.description,
        b.icon
      FROM user_badges ub
      LEFT JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `,
    args: [params.id],
  });
  const earnedBadges = badgesResult.rows;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {user.name || 'Unnamed User'}
              </h1>
              {user.is_admin === 1 && (
                <Badge variant="destructive">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>
        <UserActionButtons user={user} />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.total_xp || 0}</div>
            <p className="text-xs text-muted-foreground">
              Experience Points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.lessons_completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farms</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">Created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badges</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.badges_earned || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-sm">{user.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-sm">
                {user.is_admin === 1 ? 'Administrator' : 'User'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(user.created_at * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <p className="text-sm">
                {user.email_verified ? 'Yes' : 'Not verified'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Lesson Completions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLessons.length > 0 ? (
              recentLessons.map((lesson: any) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.topic_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-xs">
                      +{lesson.xp_reward} XP
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lesson.completed_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No lessons completed yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <CardTitle>
            Earned Badges ({earnedBadges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {earnedBadges.length > 0 ? (
              earnedBadges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center p-4 border rounded-lg"
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="font-medium text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(badge.earned_at * 1000).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No badges earned yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Farms */}
      <Card>
        <CardHeader>
          <CardTitle>Farms ({farms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {farms.length > 0 ? (
              farms.map((farm: any) => (
                <div
                  key={farm.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{farm.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {farm.acres} acres • {farm.location || 'Location not set'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={farm.is_public ? 'default' : 'secondary'}>
                      {farm.is_public ? 'Public' : 'Private'}
                    </Badge>
                    <Link href={`/farm/${farm.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No farms created yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
