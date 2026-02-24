'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';
import type { FarmStorySection } from '@/lib/db/schema';

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  origin: 'Our Story',
  values: 'Values',
  the_land: 'The Land',
  what_we_grow: 'What We Grow',
  seasons: 'Seasons',
  visit_us: 'Visit Us',
  custom: 'Custom',
};

const SECTION_TYPE_COLORS: Record<string, string> = {
  hero: 'bg-amber-100 text-amber-800',
  origin: 'bg-blue-100 text-blue-800',
  values: 'bg-purple-100 text-purple-800',
  the_land: 'bg-green-100 text-green-800',
  what_we_grow: 'bg-emerald-100 text-emerald-800',
  seasons: 'bg-orange-100 text-orange-800',
  visit_us: 'bg-cyan-100 text-cyan-800',
  custom: 'bg-gray-100 text-gray-800',
};

interface StorySectionCardProps {
  section: FarmStorySection;
  onUpdate: (sectionId: string, fields: Partial<FarmStorySection>) => void;
  onDelete: (sectionId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRegenerate: (sectionId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function StorySectionCard({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRegenerate,
  isFirst,
  isLast,
}: StorySectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);

  return (
    <Card className={`transition-all ${!section.is_visible ? 'opacity-60' : ''}`}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <Badge variant="secondary" className={`text-xs shrink-0 ${SECTION_TYPE_COLORS[section.section_type] || ''}`}>
          {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
        </Badge>
        <span className="font-medium text-sm truncate flex-1">{section.title}</span>
        {section.ai_generated === 1 && (
          <Badge variant="outline" className="text-xs gap-1 shrink-0">
            <Sparkles className="w-3 h-3" />AI Draft
          </Badge>
        )}
        <button
          className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(section.id, { is_visible: section.is_visible ? 0 : 1 } as any);
          }}
          title={section.is_visible ? 'Hide section' : 'Show section'}
        >
          {section.is_visible ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {/* Expanded editor */}
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <Input
              value={section.title}
              onChange={(e) => onUpdate(section.id, { title: e.target.value } as any)}
              className="text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPreview(!preview)}
              >
                {preview ? 'Edit' : 'Preview'}
              </Button>
            </div>
            {preview ? (
              <div className="prose prose-sm max-w-none p-3 bg-muted rounded-md min-h-[100px]">
                {section.content || <span className="text-muted-foreground italic">No content</span>}
              </div>
            ) : (
              <Textarea
                value={section.content || ''}
                onChange={(e) => onUpdate(section.id, { content: e.target.value } as any)}
                className="text-sm min-h-[100px]"
                placeholder="Write your section content..."
              />
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Media URL</label>
            <Input
              value={section.media_url || ''}
              onChange={(e) => onUpdate(section.id, { media_url: e.target.value || null } as any)}
              className="text-sm"
              placeholder="https://..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 min-w-[44px] gap-1"
              onClick={() => onRegenerate(section.id)}
              title="Regenerate with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs">Regenerate</span>
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isFirst}
              onClick={onMoveUp}
              title="Move up"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={isLast}
              onClick={onMoveDown}
              title="Move down"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => onDelete(section.id)}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                title="Delete section"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
