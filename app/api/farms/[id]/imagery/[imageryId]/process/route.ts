import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateTiles } from '@/lib/imagery/tiler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; imageryId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, imageryId } = params;

  // Update status to processing
  await db.execute({
    sql: 'UPDATE custom_imagery SET processing_status = ? WHERE id = ?',
    args: ['processing', imageryId]
  });

  try {
    // Get source URL
    const imagery = await db.execute({
      sql: 'SELECT source_url FROM custom_imagery WHERE id = ?',
      args: [imageryId]
    });

    if (imagery.rows.length === 0) {
      throw new Error('Imagery not found');
    }

    const sourceUrl = imagery.rows[0].source_url as string;

    // Generate tiles
    const tileUrlTemplate = await generateTiles(sourceUrl, farmId, imageryId);

    // Update with tile URL and mark complete
    await db.execute({
      sql: 'UPDATE custom_imagery SET tile_url_template = ?, processing_status = ?, updated_at = unixepoch() WHERE id = ?',
      args: [tileUrlTemplate, 'completed', imageryId]
    });

    return NextResponse.json({
      success: true,
      tileUrlTemplate
    });
  } catch (error: any) {
    // Mark as failed
    await db.execute({
      sql: 'UPDATE custom_imagery SET processing_status = ?, error_message = ? WHERE id = ?',
      args: ['failed', error.message, imageryId]
    });

    return NextResponse.json(
      { error: 'Processing failed', message: error.message },
      { status: 500 }
    );
  }
}
