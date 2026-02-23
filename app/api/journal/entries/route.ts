import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const farm_id = searchParams.get('farm_id');
    if (!farm_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: farm_id' },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Verify farm ownership or public access
    const farmResult = await db.execute({
      sql: 'SELECT id, user_id, is_public FROM farms WHERE id = ?',
      args: [farm_id]
    });

    if (farmResult.rows.length === 0) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = farmResult.rows[0];
    if (farm.user_id !== session.user.id && farm.is_public !== 1) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM farm_journal_entries WHERE farm_id = ? ORDER BY entry_date DESC LIMIT ? OFFSET ?',
      args: [farm_id, limit + 1, offset]
    });

    const hasMore = result.rows.length > limit;
    const entries = hasMore ? result.rows.slice(0, limit) : result.rows;

    return NextResponse.json({ entries, hasMore });
  } catch (error) {
    console.error('Failed to fetch journal entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      id,
      farm_id,
      entry_date,
      title,
      content,
      media_urls,
      weather,
      tags,
      is_shared_to_community
    } = body;

    // Validate required fields
    if (!farm_id || !content || entry_date === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: farm_id, content, entry_date' },
        { status: 400 }
      );
    }

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farm_id, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Farm not found or access denied' },
        { status: 403 }
      );
    }

    // Insert journal entry
    const entryId = id || crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO farm_journal_entries
        (id, farm_id, author_id, entry_date, title, content, media_urls, weather, tags, is_shared_to_community)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entryId,
        farm_id,
        session.user.id,
        entry_date,
        title,
        content,
        media_urls,
        weather,
        tags,
        is_shared_to_community || 0
      ]
    });

    // If shared to community, create public post
    if (is_shared_to_community === 1) {
      await db.execute({
        sql: `INSERT INTO farm_posts
          (id, farm_id, author_id, post_type, content, media_urls, is_published, journal_entry_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          farm_id,
          session.user.id,
          'journal_entry',
          content,
          media_urls,
          1,
          entryId
        ]
      });
    }

    return NextResponse.json({
      success: true,
      id: entryId
    });

  } catch (error) {
    console.error('Journal entry creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
