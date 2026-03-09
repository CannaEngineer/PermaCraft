import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT name FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, session.user.id]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  const farmName = farm.rows[0].name as string;

  // Generate PDF
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateFarmPlanPDF({
      farmName,
      mapImageDataUrl: body.mapImageDataUrl,
      includeZones: body.includeZones,
      includePlantings: body.includePlantings,
      includePhases: body.includePhases,
      zones: body.zones || [],
      plantings: body.plantings || [],
      phases: body.phases || []
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', detail: String(error) },
      { status: 500 }
    );
  }

  // Return PDF as downloadable file
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${farmName.replace(/\s+/g, '-')}-${Date.now()}.pdf"`
    }
  });
}

interface PDFExportOptions {
  farmName: string;
  mapImageDataUrl: string;
  includeZones?: boolean;
  includePlantings?: boolean;
  includePhases?: boolean;
  zones?: any[];
  plantings?: any[];
  phases?: any[];
}

async function generateFarmPlanPDF(options: PDFExportOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 612; // Letter width in points
  const PAGE_HEIGHT = 792; // Letter height in points
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  // --- Title page ---
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Title
  page.drawText(options.farmName, {
    x: MARGIN,
    y: y - 24,
    size: 24,
    font: helveticaBold,
    color: black,
  });
  y -= 50;

  // Subtitle
  page.drawText(`Farm Plan - ${new Date().toLocaleDateString()}`, {
    x: MARGIN,
    y,
    size: 12,
    font: helvetica,
    color: gray,
  });
  y -= 40;

  // Map image
  if (options.mapImageDataUrl) {
    try {
      const base64Data = options.mapImageDataUrl.split(',')[1];
      const imageBytes = Buffer.from(base64Data, 'base64');

      const isJpeg = options.mapImageDataUrl.startsWith('data:image/jpeg');
      const image = isJpeg
        ? await doc.embedJpg(imageBytes)
        : await doc.embedPng(imageBytes);

      // Fit within content area while preserving aspect ratio
      const maxImgWidth = CONTENT_WIDTH;
      const maxImgHeight = y - MARGIN - 20;
      const imgDims = image.scaleToFit(maxImgWidth, maxImgHeight);

      page.drawImage(image, {
        x: MARGIN + (CONTENT_WIDTH - imgDims.width) / 2,
        y: y - imgDims.height,
        width: imgDims.width,
        height: imgDims.height,
      });
    } catch (imgError) {
      console.error('Failed to embed map image in PDF:', imgError);
      page.drawText('[Map image could not be embedded]', {
        x: MARGIN,
        y: y - 12,
        size: 10,
        font: helvetica,
        color: gray,
      });
    }
  }

  // --- Zones section ---
  if (options.includeZones && options.zones && options.zones.length > 0) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    page.drawText('Zones', {
      x: MARGIN,
      y: y - 18,
      size: 18,
      font: helveticaBold,
      color: black,
    });
    // Underline
    page.drawLine({
      start: { x: MARGIN, y: y - 22 },
      end: { x: MARGIN + helveticaBold.widthOfTextAtSize('Zones', 18), y: y - 22 },
      thickness: 1,
      color: black,
    });
    y -= 45;

    for (const zone of options.zones) {
      if (y < MARGIN + 60) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      const zoneName = zone.name || `Zone (${zone.zone_type})`;
      page.drawText(zoneName, {
        x: MARGIN,
        y: y - 14,
        size: 14,
        font: helveticaBold,
        color: black,
      });
      y -= 20;

      page.drawText(`Type: ${zone.zone_type}`, {
        x: MARGIN,
        y: y - 10,
        size: 10,
        font: helvetica,
        color: gray,
      });
      y -= 16;

      if (zone.properties) {
        try {
          const props = typeof zone.properties === 'string'
            ? JSON.parse(zone.properties)
            : zone.properties;
          if (props.area_acres) {
            page.drawText(`Area: ${props.area_acres.toFixed(2)} acres`, {
              x: MARGIN,
              y: y - 10,
              size: 10,
              font: helvetica,
              color: gray,
            });
            y -= 16;
          }
        } catch {
          // Ignore parsing errors
        }
      }

      y -= 10;
    }
  }

  // --- Plantings section ---
  if (options.includePlantings && options.plantings && options.plantings.length > 0) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    page.drawText('Plantings', {
      x: MARGIN,
      y: y - 18,
      size: 18,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: MARGIN, y: y - 22 },
      end: { x: MARGIN + helveticaBold.widthOfTextAtSize('Plantings', 18), y: y - 22 },
      thickness: 1,
      color: black,
    });
    y -= 45;

    for (const planting of options.plantings) {
      if (y < MARGIN + 60) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      const plantingName = planting.name || 'Unnamed Planting';
      page.drawText(plantingName, {
        x: MARGIN,
        y: y - 14,
        size: 14,
        font: helveticaBold,
        color: black,
      });
      y -= 20;

      if (planting.species_name) {
        page.drawText(`Species: ${planting.species_name}`, {
          x: MARGIN,
          y: y - 10,
          size: 10,
          font: helvetica,
          color: gray,
        });
        y -= 16;
      }

      if (planting.planted_year) {
        page.drawText(`Planted: ${planting.planted_year}`, {
          x: MARGIN,
          y: y - 10,
          size: 10,
          font: helvetica,
          color: gray,
        });
        y -= 16;
      }

      y -= 10;
    }
  }

  // --- Phases section ---
  if (options.includePhases && options.phases && options.phases.length > 0) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    page.drawText('Implementation Phases', {
      x: MARGIN,
      y: y - 18,
      size: 18,
      font: helveticaBold,
      color: black,
    });
    page.drawLine({
      start: { x: MARGIN, y: y - 22 },
      end: { x: MARGIN + helveticaBold.widthOfTextAtSize('Implementation Phases', 18), y: y - 22 },
      thickness: 1,
      color: black,
    });
    y -= 45;

    for (const phase of options.phases) {
      if (y < MARGIN + 60) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      page.drawText(phase.name, {
        x: MARGIN,
        y: y - 14,
        size: 14,
        font: helveticaBold,
        color: black,
      });
      y -= 20;

      if (phase.description) {
        page.drawText(phase.description, {
          x: MARGIN,
          y: y - 10,
          size: 10,
          font: helvetica,
          color: gray,
        });
        y -= 16;
      }

      if (phase.start_date || phase.end_date) {
        const startDate = phase.start_date
          ? new Date(phase.start_date * 1000).toLocaleDateString()
          : '?';
        const endDate = phase.end_date
          ? new Date(phase.end_date * 1000).toLocaleDateString()
          : '?';
        page.drawText(`Timeline: ${startDate} - ${endDate}`, {
          x: MARGIN,
          y: y - 10,
          size: 10,
          font: helvetica,
          color: gray,
        });
        y -= 16;
      }

      y -= 10;
    }
  }

  return doc.save();
}
