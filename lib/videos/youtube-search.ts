import { db } from '@/lib/db';
import type { SpeciesVideo } from '@/lib/db/schema';

interface YouTubeSearchResult {
  youtube_video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
}

/**
 * Search YouTube for videos about a species.
 * Uses YouTube Data API v3 if YOUTUBE_API_KEY is set.
 * Returns cached results if available.
 */
export async function searchYouTubeForSpecies(
  speciesId: string,
  commonName: string,
  scientificName: string
): Promise<SpeciesVideo[]> {
  // Check cache first
  const cached = await db.execute({
    sql: 'SELECT * FROM species_videos WHERE species_id = ? ORDER BY is_featured DESC, relevance_score DESC',
    args: [speciesId],
  });

  if (cached.rows.length > 0) {
    return cached.rows as unknown as SpeciesVideo[];
  }

  // Only search if we have an API key
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const query = `${commonName} ${scientificName} growing permaculture`;
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '5');
    url.searchParams.set('relevanceLanguage', 'en');
    url.searchParams.set('safeSearch', 'strict');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return [];
    }

    const data = await response.json();
    const results: YouTubeSearchResult[] = (data.items || []).map((item: any) => ({
      youtube_video_id: item.id.videoId,
      title: item.snippet.title,
      channel_name: item.snippet.channelTitle,
      thumbnail_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    }));

    // Cache results to database
    const videos: SpeciesVideo[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO species_videos (id, species_id, youtube_video_id, title, channel_name, thumbnail_url, is_featured, relevance_score, approved)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [id, speciesId, result.youtube_video_id, result.title, result.channel_name, result.thumbnail_url, i === 0 ? 1 : 0, 5 - i],
      });
      videos.push({
        id,
        species_id: speciesId,
        youtube_video_id: result.youtube_video_id,
        title: result.title,
        channel_name: result.channel_name,
        thumbnail_url: result.thumbnail_url,
        duration_seconds: null,
        is_featured: i === 0 ? 1 : 0,
        relevance_score: 5 - i,
        added_by: null,
        approved: 1,
        created_at: Math.floor(Date.now() / 1000),
      });
    }

    return videos;
  } catch (error) {
    console.error('YouTube search failed:', error);
    return [];
  }
}

/**
 * Get cached videos for a species
 */
export async function getSpeciesVideos(speciesId: string): Promise<SpeciesVideo[]> {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM species_videos WHERE species_id = ? AND approved = 1 ORDER BY is_featured DESC, relevance_score DESC',
      args: [speciesId],
    });
    return result.rows as unknown as SpeciesVideo[];
  } catch {
    return [];
  }
}
