'use client';

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
  onPostCreated
}: CreatePostDialogProps) {
  // Placeholder - will be implemented in Task 3
  return null;
}
