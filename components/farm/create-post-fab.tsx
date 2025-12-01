'use client';

import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { CreatePostDialog } from './create-post-dialog';

interface CreatePostFABProps {
  farmId: string;
  onPostCreated: () => void;
}

export function CreatePostFAB({ farmId, onPostCreated }: CreatePostFABProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="h-6 w-6" />
      </Button>
      <CreatePostDialog
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        onPostCreated={() => {
          onPostCreated();
          setOpen(false);
        }}
      />
    </>
  );
}
