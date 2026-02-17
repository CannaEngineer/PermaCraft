'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowFarmButtonProps {
  farmId: string;
  initialFollowing?: boolean;
  initialCount?: number;
  showCount?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function FollowFarmButton({
  farmId,
  initialFollowing = false,
  initialCount,
  showCount = false,
  size = 'sm',
  className,
}: FollowFarmButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(initialFollowing !== undefined);

  // Check follow status on mount if not provided
  useEffect(() => {
    if (initialFollowing !== undefined) return;
    let cancelled = false;
    fetch(`/api/farms/${farmId}/follow`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) {
          setFollowing(data.following);
          if (data.follower_count !== undefined) setCount(data.follower_count);
          setChecked(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [farmId, initialFollowing]);

  const handleToggle = async () => {
    if (loading) return;
    const optimisticFollowing = !following;
    const optimisticCount = optimisticFollowing ? count + 1 : Math.max(0, count - 1);

    setFollowing(optimisticFollowing);
    setCount(optimisticCount);
    setLoading(true);

    try {
      const res = await fetch(`/api/farms/${farmId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setFollowing(data.following);
      if (data.follower_count !== undefined) setCount(data.follower_count);
    } catch {
      // Rollback on error
      setFollowing(!optimisticFollowing);
      setCount(count);
    } finally {
      setLoading(false);
    }
  };

  if (!checked && initialFollowing === undefined) return null;

  return (
    <Button
      variant={following ? 'secondary' : 'outline'}
      size={size}
      onClick={handleToggle}
      disabled={loading}
      className={cn('gap-1.5 shrink-0', className)}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : following ? (
        <UserCheck className="w-3.5 h-3.5" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      <span>{following ? 'Following' : 'Follow'}</span>
      {showCount && count > 0 && (
        <span className="text-muted-foreground">· {count}</span>
      )}
    </Button>
  );
}
