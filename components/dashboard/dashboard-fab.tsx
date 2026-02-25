'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { MapIcon, MessageSquare, Upload, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { JournalEntryForm } from '@/components/farm/journal-entry-form';
import { CreatePostDialog } from '@/components/farm/create-post-dialog';
import { FarmSelectorDialog } from '@/components/dashboard/farm-selector-dialog';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

type PendingAction = 'post' | 'upload' | 'journal';

export function DashboardFAB() {
  const router = useRouter();
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [farmSelectorOpen, setFarmSelectorOpen] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>();
  const [farms, setFarms] = useState<Array<{ id: string; name: string; acres: number | null }>>([]);
  const [farmsLoaded, setFarmsLoaded] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);

  const fetchFarms = useCallback(async () => {
    if (farmsLoaded) return farms;
    try {
      const res = await fetch('/api/farms');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFarms(data.farms);
      setFarmsLoaded(true);
      return data.farms;
    } catch {
      toast.error('Failed to load farms');
      return [];
    }
  }, [farmsLoaded, farms]);

  const executeAction = useCallback((action: PendingAction, farmId: string, files?: FileList | null) => {
    setSelectedFarmId(farmId);
    switch (action) {
      case 'post':
        setPostDialogOpen(true);
        break;
      case 'upload':
        if (files) uploadFiles(farmId, files);
        break;
      case 'journal':
        setJournalDialogOpen(true);
        break;
    }
  }, []);

  const ensureFarmSelected = useCallback(async (action: PendingAction, files?: FileList) => {
    const userFarms = await fetchFarms();
    if (userFarms.length === 0) {
      toast.error('Create a farm first before posting');
      return;
    }
    if (files) setPendingFiles(files);
    if (userFarms.length === 1) {
      executeAction(action, userFarms[0].id, files);
    } else {
      setPendingAction(action);
      setFarmSelectorOpen(true);
    }
  }, [fetchFarms, executeAction]);

  const handleFarmSelected = (farmId: string) => {
    setFarmSelectorOpen(false);
    if (pendingAction) {
      executeAction(pendingAction, farmId, pendingFiles);
      setPendingAction(null);
      setPendingFiles(null);
    }
  };

  const uploadFiles = async (farmId: string, files: FileList) => {
    try {
      for (const file of Array.from(files)) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 3000,
          useWebWorker: true,
        });

        const imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });

        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmId, imageData }),
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const { url } = await uploadRes.json();

        await fetch(`/api/farms/${farmId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'photo', media_urls: [url] }),
        });
      }
      toast.success(`${files.length} photo(s) uploaded`);
    } catch {
      toast.error('Failed to upload image(s)');
    }
  };

  const handleQuickPost = () => {
    ensureFarmSelected('post');
  };

  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      ensureFarmSelected('upload', files);
    };
    input.click();
  };

  const handleLogObservation = () => {
    ensureFarmSelected('journal');
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

      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        farmId={selectedFarmId!}
        onPostCreated={() => {
          setPostDialogOpen(false);
          toast.success('Post created!');
        }}
      />

      <FarmSelectorDialog
        open={farmSelectorOpen}
        onOpenChange={setFarmSelectorOpen}
        farms={farms}
        onSelect={handleFarmSelected}
      />

      <JournalEntryForm
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
        farmId={selectedFarmId}
        onEntryCreated={() => setJournalDialogOpen(false)}
      />
    </>
  );
}
