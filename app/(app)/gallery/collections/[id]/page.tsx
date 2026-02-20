import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Globe, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/register?from=gallery');

  // Fetch collection with curator info
  const collectionResult = await db.execute({
    sql: `
      SELECT c.*, u.name as curator_name, u.image as curator_image
      FROM collections c
      JOIN users u ON c.curator_id = u.id
      WHERE c.id = ?
    `,
    args: [id],
  });

  if (collectionResult.rows.length === 0) {
    notFound();
  }

  const collection = collectionResult.rows[0] as any;

  // Check visibility
  if (!collection.is_public && collection.curator_id !== session?.user.id) {
    notFound();
  }

  // Fetch items
  const itemsResult = await db.execute({
    sql: `
      SELECT ci.*,
             f.name as farm_name, f.description as farm_description, f.climate_zone as farm_climate,
             p.content as post_content, p.post_type, p.media_urls as post_media,
             p.reaction_count as post_reactions, p.comment_count as post_comments,
             pu.name as post_author_name, pu.image as post_author_image, pu.id as post_author_id
      FROM collection_items ci
      LEFT JOIN farms f ON ci.farm_id = f.id
      LEFT JOIN farm_posts p ON ci.post_id = p.id
      LEFT JOIN users pu ON p.author_id = pu.id
      WHERE ci.collection_id = ?
      ORDER BY ci.display_order ASC, ci.added_at DESC
    `,
    args: [id],
  });

  const items = itemsResult.rows as any[];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link
        href="/gallery/collections"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      {/* Collection Header */}
      <div className="mb-8">
        {collection.cover_image_url && (
          <div className="h-48 rounded-xl overflow-hidden mb-6">
            <img
              src={collection.cover_image_url}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{collection.title}</h1>
              {collection.is_public ? (
                <Globe className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            {collection.description && (
              <p className="text-muted-foreground mt-2">{collection.description}</p>
            )}
          </div>
        </div>

        {/* Curator Info */}
        <div className="flex items-center gap-2 mt-4">
          <Link href={`/profile/${collection.curator_id}`}>
            <Avatar className="w-6 h-6">
              <AvatarImage src={collection.curator_image || undefined} />
              <AvatarFallback className="text-xs">
                {collection.curator_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <span className="text-sm text-muted-foreground">
            Curated by{' '}
            <Link href={`/profile/${collection.curator_id}`} className="hover:underline font-medium text-foreground">
              {collection.curator_name}
            </Link>
          </span>
          <Badge variant="outline" className="text-xs">
            {items.length} items
          </Badge>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>This collection is empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                {item.post_id ? (
                  // Post item
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/profile/${item.post_author_id}`}>
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={item.post_author_image || undefined} />
                          <AvatarFallback className="text-xs">
                            {item.post_author_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link href={`/profile/${item.post_author_id}`} className="text-sm font-medium hover:underline">
                        {item.post_author_name}
                      </Link>
                      <Badge variant="secondary" className="text-xs">{item.post_type}</Badge>
                    </div>
                    {item.post_content && (
                      <p className="text-sm line-clamp-3">{item.post_content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{item.post_reactions} reactions</span>
                      <span>{item.post_comments} comments</span>
                    </div>
                  </div>
                ) : item.farm_id ? (
                  // Farm item
                  <Link href={`/farm/${item.farm_id}`}>
                    <h3 className="font-semibold hover:underline">{item.farm_name}</h3>
                    {item.farm_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.farm_description}
                      </p>
                    )}
                    {item.farm_climate && (
                      <Badge variant="outline" className="text-xs mt-2">{item.farm_climate}</Badge>
                    )}
                  </Link>
                ) : null}
                {item.curator_note && (
                  <p className="text-sm italic text-muted-foreground mt-2 pt-2 border-t">
                    "{item.curator_note}"
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
