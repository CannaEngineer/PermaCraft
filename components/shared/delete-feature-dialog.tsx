'use client';

import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';

interface DeleteFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  featureId: string;
  featureType: 'zone' | 'planting' | 'line';
  featureName?: string;
  onDeleteSuccess: () => void;
}

export function DeleteFeatureDialog({
  open,
  onOpenChange,
  farmId,
  featureId,
  featureType,
  featureName,
  onDeleteSuccess,
}: DeleteFeatureDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);

    try {
      // Determine the API endpoint based on feature type
      let endpoint = '';
      if (featureType === 'zone') {
        endpoint = `/api/farms/${farmId}/zones/${featureId}`;
      } else if (featureType === 'planting') {
        endpoint = `/api/farms/${farmId}/plantings/${featureId}`;
      } else if (featureType === 'line') {
        endpoint = `/api/farms/${farmId}/lines/${featureId}`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feature');
      }

      toast({
        title: 'Deleted successfully',
        description: `${featureType.charAt(0).toUpperCase() + featureType.slice(1)} has been removed from your farm.`,
      });

      onDeleteSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete the feature. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const featureTypeLabel = {
    zone: 'Zone',
    planting: 'Planting',
    line: 'Line',
  }[featureType];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {featureTypeLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            {featureName ? `"${featureName}"` : `this ${featureType}`}? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
