'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { MapIcon, MessageSquare, Upload, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { JournalEntryForm } from '@/components/farm/journal-entry-form';

export function DashboardFAB() {
  const router = useRouter();
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>();

  const handleQuickPost = () => {
    // TODO: Open create post dialog
    console.log('Quick post clicked');
  };

  const handleUploadImage = () => {
    // Open native file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      // TODO: Upload to R2 and create post
      console.log('Upload files:', files);
    };
    input.click();
  };

  const handleLogObservation = () => {
    // TODO: Get user's farms and let them select one
    // For now, just open dialog
    setJournalDialogOpen(true);
  };

  const actions: FABAction[] = [
    {
      icon: <MapIcon className="h-5 w-5" />,
      label: 'Create Farm',
      onClick: () => router.push('/farm/new'),
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Quick Post',
      onClick: handleQuickPost,
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Image',
      onClick: handleUploadImage,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Log Observation',
      onClick: handleLogObservation,
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <>
      <FAB
        actions={actions}
        ariaLabel="Quick actions"
        className="md:bottom-24 md:right-8"
      />

      <JournalEntryForm
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
        farmId={selectedFarmId}
      />
    </>
  );
}
