import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { GenerationEditor } from '@/components/admin/generation-editor';

async function getGeneration(id: string) {
  const result = await db.execute({
    sql: `
      SELECT cg.*, t.name as topic_name
      FROM content_generations cg
      LEFT JOIN topics t ON cg.topic_id = t.id
      WHERE cg.id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const gen = result.rows[0] as any;
  return {
    ...gen,
    raw_output: JSON.parse(gen.raw_output),
    input_prompt: JSON.parse(gen.input_prompt),
    edited_output: gen.edited_output ? JSON.parse(gen.edited_output) : null,
  };
}

async function GenerationPage({ params }: { params: { id: string } }) {
  const generation = await getGeneration(params.id);

  if (!generation) {
    notFound();
  }

  return <GenerationEditor generation={generation} />;
}

export default function GenerationPageWrapper({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerationPage params={params} />
    </Suspense>
  );
}
