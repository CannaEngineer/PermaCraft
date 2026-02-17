import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { CollectionCard } from '@/components/collections/collection-card';
import { CreateCollectionDialog } from '@/components/collections/create-collection-dialog';
import Link from 'next/link';
import { ChevronLeft, Layers } from 'lucide-react';

export default async function CollectionsPage() {
  const session = await requireAuth();

  const result = await db.execute({
    sql: `
      SELECT c.*, COUNT(ci.id) as item_count
      FROM collections c
      LEFT JOIN collection_items ci ON c.id = ci.collection_id
      WHERE c.curator_id = ?
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `,
    args: [session.user.id],
  });

  const collections = result.rows as any[];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Community
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Collections</h1>
            <p className="text-muted-foreground mt-2">
              Organize farms and posts into curated collections
            </p>
          </div>
          <CreateCollectionDialog />
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No collections yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first collection to save and organize content.
          </p>
          <CreateCollectionDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
