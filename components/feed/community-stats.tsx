import { db } from '@/lib/db';
import { Users, MapPin, Sprout, TrendingUp } from 'lucide-react';

async function fetchCommunityStats() {
  try {
    // Get total users with public farms
    const usersResult = await db.execute({
      sql: `SELECT COUNT(DISTINCT user_id) as count FROM farms WHERE is_public = 1`,
      args: [],
    });

    // Get total public farms
    const farmsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM farms WHERE is_public = 1`,
      args: [],
    });

    // Get total posts
    const postsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM farm_posts WHERE is_published = 1`,
      args: [],
    });

    // Get total species
    const speciesResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM species`,
      args: [],
    });

    return {
      users: (usersResult.rows[0] as any)?.count || 0,
      farms: (farmsResult.rows[0] as any)?.count || 0,
      posts: (postsResult.rows[0] as any)?.count || 0,
      species: (speciesResult.rows[0] as any)?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching community stats:', error);
    return { users: 0, farms: 0, posts: 0, species: 0 };
  }
}

export async function CommunityStats() {
  const stats = await fetchCommunityStats();

  const statItems = [
    {
      label: 'Farmers',
      value: stats.users.toLocaleString(),
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Farms',
      value: stats.farms.toLocaleString(),
      icon: MapPin,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Posts',
      value: stats.posts.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Species',
      value: stats.species.toLocaleString(),
      icon: Sprout,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50"
        >
          <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center flex-shrink-0`}>
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
