import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

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
