import { getSpeciesById } from '@/lib/species/species-queries';
import { PlantStoryClient } from '@/components/plants/story/plant-story-client';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth/session';
import { RegisterCTA } from '@/components/shared/register-cta';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const species = await getSpeciesById(id);

  if (!species) {
    return { title: 'Plant Not Found' };
  }

  const description = species.description
    || `Learn about ${species.common_name} (${species.scientific_name}) - a ${species.layer} layer plant for permaculture design.`;

  return {
    title: `${species.common_name} - Plant Story | Permaculture.Studio`,
    description,
    openGraph: {
      title: `${species.common_name} (${species.scientific_name})`,
      description,
      type: 'article',
    },
  };
}

export default async function PlantStoryPage({ params }: Props) {
  const { id } = await params;
  const species = await getSpeciesById(id);

  if (!species) {
    notFound();
  }

  const session = await getSession();

  return (
    <>
      <PlantStoryClient speciesId={id} />
      {!session && (
        <div className="mt-10">
          <RegisterCTA variant="plants" />
        </div>
      )}
    </>
  );
}
