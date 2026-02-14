'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';

interface CompanionSpeciesCardProps {
  companion: any;
  onRemove: () => void;
}

export function CompanionSpeciesCard({ companion, onRemove }: CompanionSpeciesCardProps) {
  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />

          <div className="flex-1 min-w-0">
            <div className="font-medium">{companion.common_name}</div>
            <div className="text-sm text-muted-foreground italic">
              {companion.scientific_name}
            </div>

            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">{companion.layer}</Badge>
              <Badge variant="outline">{companion.primary_benefit?.replace(/_/g, ' ')}</Badge>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Spacing: {companion.min_distance_feet}-{companion.max_distance_feet} ft |
              Count: {companion.count}
            </div>

            {companion.explanation && (
              <div className="text-sm mt-2 text-muted-foreground">
                {companion.explanation}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
