import { db } from '@/lib/db';
import { MapPin, Sprout, Share2, Trophy } from 'lucide-react';

interface DashboardStatsProps {
  farmCount: number;
  plantingCount: number;
  postCount: number;
  userId: string;
}

async function fetchUserXP(userId: string): Promise<number> {
  try {
    const result = await db.execute({
      sql: `SELECT total_xp FROM user_progress WHERE user_id = ? LIMIT 1`,
      args: [userId],
    });
    return result.rows.length > 0 ? (result.rows[0] as any).total_xp || 0 : 0;
  } catch (error) {
    return 0;
  }
}

export async function DashboardStats({
  farmCount,
  plantingCount,
  postCount,
  userId,
}: DashboardStatsProps) {
  const xp = await fetchUserXP(userId);

  const stats = [
    {
      label: 'Farms',
      value: farmCount,
      icon: MapPin,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Plantings',
      value: plantingCount,
      icon: Sprout,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Posts',
      value: postCount,
      icon: Share2,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'XP',
      value: xp,
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 px-4 py-3 bg-card rounded-lg border"
        >
          <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
