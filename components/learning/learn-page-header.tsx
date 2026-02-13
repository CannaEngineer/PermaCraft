'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, BookOpen, Trophy, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LearnPageHeaderProps {
  hasActivePath: boolean;
  pathName: string | null;
}

export function LearnPageHeader({ hasActivePath, pathName }: LearnPageHeaderProps) {
  const router = useRouter();
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchPath = async () => {
    setIsSwitching(true);
    try {
      const response = await fetch('/api/learning/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_path_id: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch path');
      }

      router.refresh();
    } catch (error) {
      console.error('Error switching path:', error);
      alert('Failed to switch path. Please try again.');
    } finally {
      setIsSwitching(false);
      setShowSwitchDialog(false);
    }
  };

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold">
              {hasActivePath && pathName ? pathName : 'Choose Your Path'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActivePath ? 'Your learning journey' : 'Select a personalized learning path'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hasActivePath && (
                <>
                  <DropdownMenuItem onClick={() => setShowSwitchDialog(true)}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Switch Path
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/learn/topics">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View All Topics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/learn/badges">
                  <Trophy className="mr-2 h-4 w-4" />
                  View All Badges
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Learning Path?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress in {pathName} will be saved, and you can return to it anytime.
              You'll be able to choose a new learning path.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSwitching}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchPath} disabled={isSwitching}>
              {isSwitching ? 'Switching...' : 'Switch Path'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
