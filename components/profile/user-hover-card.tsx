'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FollowUserButton } from './follow-user-button';
import Link from 'next/link';

interface UserHoverCardProps {
  userId: string;
  children: React.ReactNode;
}

interface UserData {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_own_profile: boolean;
}

export function UserHoverCard({ userId, children }: UserHoverCardProps) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUser = async () => {
    if (data || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const user = await res.json();
        setData(user);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShow(true);
      fetchUser();
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShow(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {show && (
        <div
          className="absolute z-50 top-full left-0 mt-2 w-72 bg-card border rounded-xl shadow-lg p-4 animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {data ? (
            <div>
              <div className="flex items-start gap-3">
                <Link href={`/profile/${data.id}`}>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={data.image || undefined} />
                    <AvatarFallback className="font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                      {data.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${data.id}`}
                    className="font-semibold text-sm hover:underline block truncate"
                  >
                    {data.name}
                  </Link>
                  {data.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {data.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{data.follower_count}</strong> followers
                </span>
                <span>
                  <strong className="text-foreground">{data.following_count}</strong> following
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {!data.is_own_profile && (
                  <FollowUserButton
                    userId={data.id}
                    initialFollowing={data.is_following}
                    size="sm"
                  />
                )}
                <Link href={`/profile/${data.id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
