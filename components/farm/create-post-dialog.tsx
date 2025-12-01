'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextPostTab } from './text-post-tab';
import { PhotoPostTab } from './photo-post-tab';
import { AIInsightTab } from './ai-insight-tab';
import { FileTextIcon, ImageIcon, SparklesIcon } from 'lucide-react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  onPostCreated: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  farmId,
  onPostCreated,
}: CreatePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileTextIcon className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageIcon className="w-4 h-4 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="ai">
              <SparklesIcon className="w-4 h-4 mr-2" />
              AI Insight
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <TextPostTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>

          <TabsContent value="photo">
            <PhotoPostTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>

          <TabsContent value="ai">
            <AIInsightTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
