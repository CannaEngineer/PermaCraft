'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendingHashtag {
  hashtag: string;
  count: number;
}

interface TrendingHashtagsResponse {
  hashtags: TrendingHashtag[];
  period: string;
}

export function TrendingHashtags() {
  const router = useRouter();
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrendingHashtags() {
      try {
        const response = await fetch('/api/feed/trending-hashtags?limit=10');
        if (!response.ok) {
          throw new Error('Failed to fetch trending hashtags');
        }
        const data: TrendingHashtagsResponse = await response.json();
        setHashtags(data.hashtags);
      } catch (err) {
        console.error('Error fetching trending hashtags:', err);
        setError('Failed to load trending hashtags');
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingHashtags();
  }, []);

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/gallery?hashtag=${encodeURIComponent(hashtag)}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle className="text-lg">Trending Topics</CardTitle>
          </div>
          <CardDescription>Popular hashtags in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || hashtags.length === 0) {
    return null; // Don't show the widget if there's an error or no hashtags
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Trending Topics</CardTitle>
        </div>
        <CardDescription>Popular hashtags in the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {hashtags.map((item, index) => (
            <button
              key={item.hashtag}
              onClick={() => handleHashtagClick(item.hashtag)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground font-medium text-sm">
                  {index + 1}
                </span>
                <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate group-hover:text-primary transition-colors">
                  {item.hashtag}
                </span>
              </div>
              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                {item.count}
              </Badge>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
