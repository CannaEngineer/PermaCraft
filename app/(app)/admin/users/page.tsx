import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserCheck,
  UserPlus,
  Activity,
  Shield,
  Eye,
  Ban,
  Mail,
  Calendar,
  Award,
} from 'lucide-react';

interface PageProps {
  searchParams: { search?: string; role?: string; status?: string };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdmin();

  // Build user query (calculate stats from actual tables)
  let query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.is_admin,
      u.created_at,
      COUNT(DISTINCT f.id) as farm_count,
      COUNT(DISTINCT lc.id) as lessons_completed,
      SUM(DISTINCT l.xp_reward) as total_xp,
      COUNT(DISTINCT ub.id) as badges_earned,
      MAX(lc.completed_at) as last_activity
    FROM users u
    LEFT JOIN farms f ON u.id = f.user_id
    LEFT JOIN lesson_completions lc ON u.id = lc.user_id
    LEFT JOIN lessons l ON lc.lesson_id = l.id
    LEFT JOIN user_badges ub ON u.id = ub.user_id
    WHERE 1=1
  `;

  const args: any[] = [];

  if (searchParams.search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    const searchTerm = `%${searchParams.search}%`;
    args.push(searchTerm, searchTerm);
  }

  if (searchParams.role === 'admin') {
    query += ` AND u.is_admin = 1`;
  } else if (searchParams.role === 'user') {
    query += ` AND u.is_admin = 0`;
  }

  query += `
    GROUP BY u.id, u.name, u.email, u.is_admin, u.created_at
    ORDER BY u.created_at DESC
  `;

  const usersResult = await db.execute({ sql: query, args });
  const users = usersResult.rows as any[];

  // Get stats
  const statsResult = await db.execute(`
    SELECT
      COUNT(DISTINCT u.id) as total_users,
      SUM(CASE WHEN u.is_admin = 1 THEN 1 ELSE 0 END) as admin_count,
      COUNT(DISTINCT CASE 
        WHEN lc.completed_at > datetime('now', '-7 days') 
        THEN u.id 
      END) as active_weekly,
      COUNT(DISTINCT CASE 
        WHEN u.created_at > datetime('now', '-30 days') 
        THEN u.id 
      END) as new_this_month
    FROM users u
    LEFT JOIN lesson_completions lc ON u.id = lc.user_id
  `);
  const stats = statsResult.rows[0] as any;

  // Get recent registrations
  const recentResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count, date(created_at) as date
      FROM users
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 7
    `,
    args: [],
  });
  const recentRegistrations = recentResult.rows;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, permissions, and monitor activity
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.admin_count} admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_weekly}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.active_weekly / stats.total_users) * 100)}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New (30d)</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new_this_month}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg XP</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                users.reduce((acc, u) => acc + (u.total_xp || 0), 0) / users.length || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-4">
            <Input
              type="search"
              placeholder="Search by name or email..."
              name="search"
              defaultValue={searchParams.search}
              className="max-w-sm"
            />
            <Select name="role" defaultValue={searchParams.role || 'all'}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="user">Users Only</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Apply Filters</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name || 'Unnamed User'}</span>
                        {user.is_admin === 1 && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.level && (
                          <Badge variant="secondary" className="text-xs">
                            Lv {user.level}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined{' '}
                          {new Date(user.created_at * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {user.total_xp || 0}
                    </div>
                    <div className="text-xs">XP</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {user.lessons_completed || 0}
                    </div>
                    <div className="text-xs">Lessons</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {user.farm_count || 0}
                    </div>
                    <div className="text-xs">Farms</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {user.badges_earned || 0}
                    </div>
                    <div className="text-xs">Badges</div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No users found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentRegistrations.map((reg: any) => (
              <div key={reg.date} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  {new Date(reg.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <Badge variant="secondary">{reg.count} new users</Badge>
              </div>
            ))}
            {recentRegistrations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No registrations in the last 7 days
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
