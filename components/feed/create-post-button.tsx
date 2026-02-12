'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, PenLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CreatePostButton() {
  const router = useRouter();
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [hasAIConversations, setHasAIConversations] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user has any AI conversations across their farms
    fetch('/api/user/ai-conversations')
      .then((res) => res.json())
      .then((data) => {
        setHasAIConversations(data.has_any || false);
      })
      .catch((error) => {
        console.error('Failed to check AI conversations:', error);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  const handleCreatePost = (type: 'text' | 'photo' | 'ai_insight') => {
    setSelectDialogOpen(false);
    // Navigate to dashboard with post type - user will select farm there
    router.push(`/dashboard?createPost=${type}`);
  };

  return (
    <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
      <DialogTrigger asChild>
        <Button size="default" className="gap-2 font-semibold shadow-lg">
          <Plus className="w-4 h-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Post</DialogTitle>
          <DialogDescription>
            Share your permaculture journey with the community
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <button
            onClick={() => handleCreatePost('text')}
            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Text Post</h3>
              <p className="text-sm text-muted-foreground">
                Share thoughts, updates, or ask questions
              </p>
            </div>
          </button>

          <button
            onClick={() => handleCreatePost('photo')}
            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Photo Post</h3>
              <p className="text-sm text-muted-foreground">
                Showcase your farm with beautiful images
              </p>
            </div>
          </button>

          {hasAIConversations && (
            <button
              onClick={() => handleCreatePost('ai_insight')}
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Insight</h3>
                <p className="text-sm text-muted-foreground">
                  Share AI-generated design analysis and recommendations
                </p>
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
