'use client';

import { useRouter } from 'next/navigation';
import { FAB } from '@/components/ui/fab';
import { Plus } from 'lucide-react';

interface DashboardClientProps {
  children: React.ReactNode;
}

export function DashboardClient({ children }: DashboardClientProps) {
  const router = useRouter();

  return (
    <>
      {children}
      <FAB
        icon={<Plus className="h-6 w-6" />}
        onAction={() => router.push('/farm/new')}
        ariaLabel="Create new farm"
      />
    </>
  );
}
