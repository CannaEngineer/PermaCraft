import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Farm, Zone } from "@/lib/db/schema";
import { FarmEditorClient } from "./farm-editor-client";
import { FarmFeedClient } from "@/components/feed/farm-feed-client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refresh?: string }>;
}

export default async function FarmPage({ params, searchParams }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const { refresh } = await searchParams;

  // First try to fetch farm as owner
  let farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
    args: [id, session.user.id],
  });

  let isOwner = farmResult.rows.length > 0;

  // If not found as owner, try fetching as public farm
  if (!isOwner) {
    farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND is_public = 1",
      args: [id],
    });
  }

  const farm = farmResult.rows[0] as unknown as Farm;
  if (!farm) {
    notFound();
  }

  // Get zones
  const zonesResult = await db.execute({
    sql: "SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  const zones = zonesResult.rows as unknown as Zone[];

  // Get feed posts
  const feedResult = await db.execute({
    sql: `SELECT p.*,
                 u.name as author_name,
                 u.image as author_image,
                 (SELECT reaction_type FROM post_reactions
                  WHERE post_id = p.id AND user_id = ?) as user_reaction
          FROM farm_posts p
          JOIN users u ON p.author_id = u.id
          WHERE p.farm_id = ? AND p.is_published = 1
          ORDER BY p.created_at DESC
          LIMIT 21`,
    args: [session.user.id, id],
  });

  const posts = feedResult.rows.map((post: any) => ({
    id: post.id,
    farm_id: post.farm_id,
    type: post.post_type,
    content: post.content,
    media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
    tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
    hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
    author: {
      id: post.author_id,
      name: post.author_name,
      image: post.author_image,
    },
    reaction_count: post.reaction_count,
    comment_count: post.comment_count,
    view_count: post.view_count,
    created_at: post.created_at,
    user_reaction: post.user_reaction,
  }));

  const initialFeedData = {
    posts: posts.slice(0, 20),
    next_cursor: posts.length === 21 ? posts[19].id : null,
    has_more: posts.length === 21,
  };

  return (
    <div>
      <FarmEditorClient
        farm={farm}
        initialZones={zones}
        isOwner={isOwner}
        initialIsPublic={!!farm.is_public}
      />
      <div className="mt-8 px-4 pb-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Farm Feed</h2>
        <FarmFeedClient farmId={id} initialData={initialFeedData} />
      </div>
    </div>
  );
}
