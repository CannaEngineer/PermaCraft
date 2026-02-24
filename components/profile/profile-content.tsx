'use client';

import { ProfileTabs } from './profile-tabs';
import { ProfilePostsTab } from './profile-posts-tab';
import { ProfileFarmsTab } from './profile-farms-tab';
import { ProfileBadgesTab } from './profile-badges-tab';

interface ProfileContentProps {
  tabs: { id: string; label: string; count?: number }[];
  profile: {
    badges: any[];
  };
  postsData: {
    posts: any[];
    next_cursor: string | null;
    has_more: boolean;
  };
  farms: any[];
  userId: string;
  viewerId: string | null;
}

export function ProfileContent({ tabs, profile, postsData, farms, userId, viewerId }: ProfileContentProps) {
  return (
    <ProfileTabs tabs={tabs}>
      {(activeTab) => {
        switch (activeTab) {
          case 'posts':
            return (
              <ProfilePostsTab
                userId={userId}
                currentUserId={viewerId || undefined}
                initialPosts={postsData.posts}
                initialCursor={postsData.next_cursor}
                initialHasMore={postsData.has_more}
              />
            );
          case 'farms':
            return <ProfileFarmsTab farms={farms} />;
          case 'badges':
            return <ProfileBadgesTab badges={profile.badges} />;
          default:
            return null;
        }
      }}
    </ProfileTabs>
  );
}
