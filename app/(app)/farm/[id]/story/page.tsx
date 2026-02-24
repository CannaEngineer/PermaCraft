import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { StoryEditor } from '@/components/story/story-editor';
import type { FarmStorySection } from '@/lib/db/schema';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryEditorPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id: farmId } = await params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT id, user_id, name, description, story_published, story_theme FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm) notFound();
  if (farm.user_id !== session.user.id) {
    redirect(`/farm/${farmId}`);
  }

  // Fetch sections
  const sectionsResult = await db.execute({
    sql: 'SELECT * FROM farm_story_sections WHERE farm_id = ? ORDER BY display_order ASC',
    args: [farmId],
  });

  return (
    <StoryEditor
      farmId={farmId}
      farmName={farm.name}
      farmDescription={farm.description}
      initialSections={sectionsResult.rows as unknown as FarmStorySection[]}
      storyPublished={farm.story_published === 1}
      storyTheme={farm.story_theme || 'earth'}
    />
  );
}
