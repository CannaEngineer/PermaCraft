'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const POST_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'ai_insight', label: 'AI Insights' },
  { value: 'photo', label: 'Photos' },
  { value: 'text', label: 'Updates' },
] as const;

export function PostTypeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type') || 'all';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }

    const queryString = params.toString();
    router.push(queryString ? `/gallery?${queryString}` : '/gallery');
  };

  return (
    <Tabs value={currentType} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        {POST_TYPES.map((type) => (
          <TabsTrigger key={type.value} value={type.value}>
            {type.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
