'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Layers, Lock, Globe } from 'lucide-react';

interface CollectionCardProps {
  collection: {
    id: string;
    title: string;
    description?: string;
    cover_image_url?: string;
    is_public: number;
    item_count: number;
    updated_at: number;
  };
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link href={`/gallery/collections/${collection.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5">
          {collection.cover_image_url && (
            <img
              src={collection.cover_image_url}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold line-clamp-1">{collection.title}</h3>
            {collection.is_public ? (
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Layers className="w-3 h-3" />
            <span>{collection.item_count} items</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
