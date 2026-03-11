'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Eye, Camera, Sparkles, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FarmUpdateCardProps {
  update: {
    id: string;
    farm_id: string;
    post_type: string;
    content: string | null;
    media_urls: string[] | null;
    hashtags: string[] | null;
    reaction_count: number;
    comment_count: number;
    view_count: number;
    created_at: number;
    farm_name: string;
    author_name: string;
    author_image: string | null;
    farm_screenshot: string | null;
  };
}

const postTypeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  photo: { icon: Camera, label: 'Photo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ai_insight: { icon: Sparkles, label: 'AI Insight', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  text: { icon: FileText, label: 'Update', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

export function FarmUpdateCard({ update }: FarmUpdateCardProps) {
  const config = postTypeConfig[update.post_type] || postTypeConfig.text;
  const Icon = config.icon;
  const hasImage = update.media_urls && update.media_urls.length > 0;
  const coverImage = hasImage ? update.media_urls![0] : null;

  return (
    <Link href={`/farm/${update.farm_id}`}>
      <Card className="group overflow-hidden hover:shadow-md transition-all duration-200 h-full">
        {/* Optional cover image */}
        {coverImage && (
          <div className="relative aspect-video overflow-hidden bg-muted">
            <img
              src={coverImage}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        <CardContent className="p-4 space-y-2.5">
          {/* Header: farm + type + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground overflow-hidden">
                {update.author_image ? (
                  <img src={update.author_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  update.farm_name[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{update.farm_name}</p>
                <p className="text-xs text-muted-foreground">{update.author_name}</p>
              </div>
            </div>
            <Badge className={`${config.color} border-0 text-[10px] gap-1 flex-shrink-0`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </Badge>
          </div>

          {/* Content */}
          {update.content && (
            <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
              {update.content}
            </p>
          )}

          {/* Hashtags */}
          {update.hashtags && update.hashtags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {update.hashtags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-primary/70 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: engagement + time */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {update.reaction_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {update.comment_count}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {update.view_count}
              </span>
            </div>
            <span>{formatDistanceToNow(new Date(update.created_at * 1000), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
