'use client';

import { Play, ExternalLink } from 'lucide-react';
import { STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species, SpeciesVideo } from '@/lib/db/schema';

interface WatchAndLearnCardProps {
  videos: SpeciesVideo[];
  species: Species;
}

export function WatchAndLearnCard({ videos, species }: WatchAndLearnCardProps) {
  const featured = videos.find(v => v.is_featured === 1) || videos[0];
  const rest = videos.filter(v => v.id !== featured?.id).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-6 h-6 text-red-600" />
          <span className={STORY_TYPOGRAPHY.label}>Videos</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          Watch & Learn
        </h2>
      </div>

      {/* Featured Video */}
      {featured && (
        <div className="rounded-xl overflow-hidden border bg-black aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${featured.youtube_video_id}`}
            title={featured.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          />
        </div>
      )}

      {/* More Videos */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">More videos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rest.map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
              >
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-14 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </p>
                  {video.channel_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{video.channel_name}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Fallback search link */}
      {videos.length === 0 && (
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${species.common_name} ${species.scientific_name} growing permaculture`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center rounded-xl border border-dashed p-8 hover:bg-muted/50 transition-colors"
        >
          <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Search YouTube</p>
          <p className="text-sm text-muted-foreground mt-1">
            Find videos about growing {species.common_name}
          </p>
        </a>
      )}
    </div>
  );
}
