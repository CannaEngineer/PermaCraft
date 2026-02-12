import { db } from '@/lib/db';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Eye } from 'lucide-react';

interface FeaturedFarm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  user_name: string;
  user_image: string | null;
  total_views: number;
  total_reactions: number;
  post_count: number;
}

async function fetchFeaturedFarms(): Promise<FeaturedFarm[]> {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          f.id,
          f.name,
          f.description,
          f.acres,
          f.climate_zone,
          u.name as user_name,
          u.image as user_image,
          COUNT(DISTINCT p.id) as post_count,
          COALESCE(SUM(p.view_count), 0) as total_views,
          COALESCE(SUM(p.reaction_count), 0) as total_reactions
        FROM farms f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN farm_posts p ON p.farm_id = f.id AND p.is_published = 1
        WHERE f.is_public = 1
        GROUP BY f.id, f.name, f.description, f.acres, f.climate_zone, u.name, u.image
        HAVING post_count > 0
        ORDER BY (total_views + (total_reactions * 10)) DESC
        LIMIT 6
      `,
      args: [],
    });

    return result.rows as unknown as FeaturedFarm[];
  } catch (error) {
    console.error('Error fetching featured farms:', error);
    return [];
  }
}

export async function FeaturedFarms() {
  const farms = await fetchFeaturedFarms();

  if (farms.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Featured Farms</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {farms.map((farm) => (
          <Link
            key={farm.id}
            href={`/farm/${farm.id}`}
            className="flex-shrink-0 w-[280px] snap-start group"
          >
            <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
              {/* Header with gradient background */}
              <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-10" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end gap-3">
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={farm.user_image || undefined} />
                      <AvatarFallback>{farm.user_name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pb-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{farm.name}</h3>
                      <p className="text-xs text-muted-foreground">{farm.user_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 pt-3 space-y-3">
                {farm.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {farm.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {farm.acres !== null && (
                    <Badge variant="outline" className="text-xs">
                      {farm.acres} acres
                    </Badge>
                  )}
                  {farm.climate_zone && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {farm.climate_zone}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{farm.total_views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>❤️</span>
                    <span>{farm.total_reactions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{farm.post_count} posts</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
