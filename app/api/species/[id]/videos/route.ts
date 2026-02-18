import { getSpeciesById } from '@/lib/species/species-queries';
import { searchYouTubeForSpecies, getSpeciesVideos } from '@/lib/videos/youtube-search';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const species = await getSpeciesById(params.id);
    if (!species) {
      return Response.json({ error: 'Species not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') === 'true';

    let videos;
    if (search && process.env.YOUTUBE_API_KEY) {
      videos = await searchYouTubeForSpecies(params.id, species.common_name, species.scientific_name);
    } else {
      videos = await getSpeciesVideos(params.id);
    }

    return Response.json({ videos });
  } catch (error) {
    console.error('Species videos API error:', error);
    return Response.json({ videos: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { youtube_video_id, title, channel_name, thumbnail_url } = body;

    if (!youtube_video_id || !title) {
      return Response.json({ error: 'youtube_video_id and title required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO species_videos (id, species_id, youtube_video_id, title, channel_name, thumbnail_url, added_by, approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [id, params.id, youtube_video_id, title, channel_name || null, thumbnail_url || null, session.user.id],
    });

    return Response.json({ id, message: 'Video submitted for review' }, { status: 201 });
  } catch (error) {
    console.error('Video submission error:', error);
    return Response.json({ error: 'Failed to submit video' }, { status: 500 });
  }
}
